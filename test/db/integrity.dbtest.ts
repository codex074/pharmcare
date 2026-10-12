// Database-level guarantees, run against the dev database (npm run test:db).
// Also the check for step 8's restore drill: point DATABASE_URL at the restored
// cluster and every test must still pass.
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withActor } from '@/lib/db'
import { patients } from '@/lib/db/schema'

const APP_URL = process.env.DATABASE_URL!
const SUPERUSER_URL =
  process.env.DB_TEST_SUPERUSER_URL ?? 'postgres://postgres:dev-superuser-pass@127.0.0.1:54329/pharmcare'

const A = { id: randomUUID(), name: 'ภญ.ทดสอบ เอ' }
const B = { id: randomUUID(), name: 'ภก.ทดสอบ บี' }
type Actor = typeof A

// max: 1 → every call reuses the same connection, so leftover settings from an
// earlier transaction are exercised too.
const app = postgres(APP_URL, { max: 1, onnotice: () => {} })
const root = postgres(SUPERUSER_URL, { max: 1, onnotice: () => {} })
const created: string[] = []

function as<T>(actor: Actor, fn: (tx: postgres.TransactionSql) => Promise<T>) {
  return app.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${actor.id}, true), set_config('app.user_name', ${actor.name}, true)`
    return fn(tx)
  }) as Promise<T>
}

async function newPatient(actor: Actor, extra: Record<string, unknown> = {}) {
  const hn = `T${Date.now()}${Math.floor(Math.random() * 1e4)}`
  const [row] = await as(actor, (tx) => tx`
    insert into patients ${tx({ hn, first_name: 'สมมติ', last_name: 'ทดสอบ', is_sample: true, ...extra })}
    returning *`)
  created.push(row.id)
  return row
}

const MED_REC = [{ drug: 'Metformin 500 mg', ordered: '1x2 pc', actual: '1x2 pc', status: 'match' }]

async function newVisit(actor: Actor, patientId: string) {
  const [row] = await as(actor, (tx) => tx`
    insert into visits (patient_id, date, med_rec, is_sample)
    values (${patientId}, current_date, ${tx.json(MED_REC)}, true) returning *`)
  return row
}

const CLINICAL = ['patients', 'visits', 'drps', 'high_alert_monitoring', 'adrs', 'technique_assessments']

beforeAll(async () => {
  await app`select 1`
})

afterAll(async () => {
  if (created.length) {
    await root.begin(async (tx) => {
      await tx`delete from audit_log where patient_id = any(${created})`
      for (const t of CLINICAL.slice(1)) await tx`delete from ${tx(t)} where patient_id = any(${created})`
      await tx`delete from patients where id = any(${created})`
    })
  }
  await Promise.all([app.end(), root.end()])
})

describe('privileges of pharmcare_app', () => {
  it.each(CLINICAL)('cannot DELETE from %s', async (table) => {
    await expect(app`delete from ${app(table)} where false`).rejects.toThrow(/permission denied/)
  })

  it('cannot write audit_log', async () => {
    await expect(app`update audit_log set actor_name = 'x' where false`).rejects.toThrow(/permission denied/)
    await expect(app`delete from audit_log where false`).rejects.toThrow(/permission denied/)
    await expect(
      app`insert into audit_log (table_name, record_id, action, actor_id, actor_name, diff)
          values ('patients', ${randomUUID()}, 'insert', ${A.id}, 'x', '{}')`,
    ).rejects.toThrow(/permission denied/)
  })

  it('can purge old login attempts only through the definer function', async () => {
    await expect(app`delete from login_attempts where false`).rejects.toThrow(/permission denied/)
    const [{ n }] = await app`select purge_login_attempts() as n`
    expect(typeof n).toBe('number')
  })
})

describe('actor', () => {
  it('a write without an actor fails', async () => {
    await expect(
      app`insert into patients (hn, first_name, last_name) values ('NOACTOR', 'ก', 'ข')`,
    ).rejects.toThrow(/app.user_id is not set/)
  })

  it('a write on a reused connection after an earlier actor transaction still fails', async () => {
    await newPatient(A) // sets app.user_id locally on the single pooled connection
    await expect(
      app`insert into patients (hn, first_name, last_name) values ('NOACTOR2', 'ก', 'ข')`,
    ).rejects.toThrow(/app.user_id is not set/)
  })

  it('a forged created_by is replaced by the actor', async () => {
    const p = await newPatient(A, { created_by: B.id, created_by_name: B.name })
    expect(p.created_by).toBe(A.id)
    expect(p.created_by_name).toBe(A.name)
  })

  it('withActor() from lib/db stamps the actor', async () => {
    const hn = `W${Date.now()}`
    const [row] = await withActor(A, (tx) =>
      tx.insert(patients).values({ hn, firstName: 'สมมติ', lastName: 'ทดสอบ', isSample: true }).returning(),
    )
    created.push(row.id)
    expect(row.createdBy).toBe(A.id)
  })
})

describe('owner-only edits', () => {
  it('the owner can edit and the change is audited with a diff', async () => {
    const p = await newPatient(A)
    const v = await newVisit(A, p.id)
    const [u] = await as(A, (tx) => tx`update visits set sbp = 128 where id = ${v.id} returning *`)
    expect(u.updated_by).toBe(A.id)
    const [log] = await app`select * from audit_log where record_id = ${v.id} and action = 'update'`
    expect(log.diff).toEqual({ sbp: { from: null, to: 128 } })
    expect(log.patient_id).toBe(p.id)
    expect(log.actor_name).toBe(A.name)
  })

  it("another pharmacist cannot edit A's record", async () => {
    const p = await newPatient(A)
    const v = await newVisit(A, p.id)
    await expect(as(B, (tx) => tx`update visits set sbp = 120 where id = ${v.id}`)).rejects.toThrow(
      /only the pharmacist who recorded this/,
    )
  })

  it('created_* and patient_id are immutable even for the owner', async () => {
    const p = await newPatient(A)
    const other = await newPatient(A)
    const v = await newVisit(A, p.id)
    await expect(as(A, (tx) => tx`update visits set created_at = now() - interval '1 day' where id = ${v.id}`)).rejects.toThrow(
      /cannot be changed/,
    )
    await expect(as(A, (tx) => tx`update visits set patient_id = ${other.id} where id = ${v.id}`)).rejects.toThrow(
      /cannot be changed/,
    )
  })

  it('anyone may sync HIS columns of a patient, and it is audited', async () => {
    const p = await newPatient(A)
    await as(B, (tx) => tx`update patients set first_name = 'สมมติใหม่', his_synced_at = now() where id = ${p.id}`)
    const [log] = await app`select * from audit_log where record_id = ${p.id} and action = 'update'`
    expect(log.actor_id).toBe(B.id)
    expect(log.diff.first_name).toEqual({ from: 'สมมติ', to: 'สมมติใหม่' })
  })

  it("a non-owner cannot change a patient's clinical fields", async () => {
    const p = await newPatient(A)
    await expect(as(B, (tx) => tx`update patients set weight_kg = 70 where id = ${p.id}`)).rejects.toThrow(
      /only the pharmacist who recorded this/,
    )
    await expect(as(B, (tx) => tx`update patients set goal_a1c = 6.5, first_name = 'ใหม่' where id = ${p.id}`)).rejects.toThrow(
      /only the pharmacist who recorded this/,
    )
  })

  it('a no-op update writes nothing', async () => {
    const p = await newPatient(A)
    await as(A, (tx) => tx`update patients set first_name = first_name where id = ${p.id}`)
    const logs = await app`select action from audit_log where record_id = ${p.id}`
    expect(logs.map((l) => l.action)).toEqual(['insert'])
  })
})

describe('cancel', () => {
  it('requires a reason', async () => {
    const p = await newPatient(A)
    const v = await newVisit(A, p.id)
    await expect(as(A, (tx) => tx`update visits set cancelled_at = now() where id = ${v.id}`)).rejects.toThrow(
      /cancel reason is required/,
    )
    await expect(
      as(A, (tx) => tx`update visits set cancelled_at = now(), cancel_reason = '  ' where id = ${v.id}`),
    ).rejects.toThrow(/cancel reason is required/)
  })

  it('is audited as cancel, stamps cancelled_by and is one-way', async () => {
    const p = await newPatient(A)
    const v = await newVisit(A, p.id)
    const [c] = await as(A, (tx) => tx`
      update visits set cancelled_at = now(), cancel_reason = 'บันทึกผิดคน', cancelled_by = ${B.id}
      where id = ${v.id} returning *`)
    expect(c.cancelled_by).toBe(A.id)
    const [log] = await app`select action from audit_log where record_id = ${v.id} and action <> 'insert'`
    expect(log.action).toBe('cancel')
    await expect(as(A, (tx) => tx`update visits set sbp = 120 where id = ${v.id}`)).rejects.toThrow(/cancelled record/)
    await expect(
      as(A, (tx) => tx`update visits set cancelled_at = null, cancelled_by = null, cancel_reason = null where id = ${v.id}`),
    ).rejects.toThrow(/cancelled record/)
  })

  it('a non-owner cannot cancel a patient', async () => {
    const p = await newPatient(A)
    await expect(
      as(B, (tx) => tx`update patients set cancelled_at = now(), cancel_reason = 'x' where id = ${p.id}`),
    ).rejects.toThrow(/only the pharmacist who recorded this/)
  })

  it('a record cannot be inserted already cancelled', async () => {
    const p = await newPatient(A)
    await expect(
      as(A, (tx) => tx`
        insert into visits (patient_id, date, med_rec, cancelled_at, cancelled_by, cancel_reason)
        values (${p.id}, current_date, ${tx.json(MED_REC)}, now(), ${A.id}, 'x')`),
    ).rejects.toThrow(/already cancelled/)
  })

  it('a cancelled registration frees the HN', async () => {
    const p = await newPatient(A)
    await expect(newPatient(A, { hn: p.hn })).rejects.toThrow(/patients_hn_active_uq/)
    await as(A, (tx) => tx`update patients set cancelled_at = now(), cancel_reason = 'ลงทะเบียนซ้ำ' where id = ${p.id}`)
    const again = await newPatient(A, { hn: p.hn })
    expect(again.hn).toBe(p.hn)
  })
})

describe('constraints', () => {
  it('rejects unknown codes, empty med rec and inverted targets', async () => {
    const p = await newPatient(A)
    await expect(
      as(A, (tx) => tx`insert into visits (patient_id, date, med_rec) values (${p.id}, current_date, '[]'::jsonb)`),
    ).rejects.toThrow(/visits_med_rec/)
    await expect(
      as(A, (tx) => tx`
        insert into drps (patient_id, date, category, detail, interventions, acceptance)
        values (${p.id}, current_date, 'made_up', 'x', '{counsel}', 'pending')`),
    ).rejects.toThrow(/drps_category/)
    await expect(
      as(A, (tx) => tx`
        insert into high_alert_monitoring (patient_id, date, drug, parameter, value, target_low, target_high, action)
        values (${p.id}, current_date, 'warfarin', 'INR', 2.5, 3, 2, 'maintain')`),
    ).rejects.toThrow(/high_alert_target/)
  })
})
