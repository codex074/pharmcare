'use server'

import { and, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { scoreTechnique, type AssessedStep } from '@/lib/calc/technique'
import { buildStepSnapshot, type Device } from '@/lib/checklists'
import { clients, withActor } from '@/lib/db'
import { careCounts, findActivePatientByHn } from '@/lib/patients/queries'
import { cancelSchema, formErrors, SCHEMAS, type FormErrors, type RecordKind } from '@/lib/records/schemas'
import { isRecordKind, TABLES } from '@/lib/records/tables'
import { bangkokDate } from '@/lib/thai-date'
import { patientHref } from '@/lib/patients/href'

export type SaveResult = { errors?: FormErrors; message?: string } | undefined

type Back = { tab?: string; clinic?: string }
type AnyTable = (typeof TABLES)[RecordKind]

const MESSAGES = {
  noPatient: 'ไม่พบผู้ป่วยรายนี้ (อาจถูกยกเลิกทะเบียน) โหลดหน้าใหม่',
  notFound: 'ไม่พบรายการนี้ โหลดหน้าใหม่',
  cancelled: 'รายการนี้ถูกยกเลิกแล้ว แก้ไขไม่ได้',
  notOwner: 'แก้ไขหรือยกเลิกได้เฉพาะผู้ที่บันทึกรายการนี้',
  invalid: 'ข้อมูลไม่ผ่านการตรวจสอบ ตรวจช่องที่กรอกอีกครั้ง',
  failed: 'บันทึกไม่สำเร็จ ลองอีกครั้ง',
  liveRecords: 'ยกเลิกทะเบียนไม่ได้ เพราะยังมีรายการบริบาลที่ไม่ได้ยกเลิก',
}

function dbMessage(e: unknown): string {
  const err = e as { code?: string; message?: string; cause?: { code?: string; message?: string } }
  const pg = err.cause ?? err
  if (pg.message?.includes('cancelled record')) return MESSAGES.cancelled
  if (pg.code === '42501') return MESSAGES.notOwner
  if (pg.code === '23514' || pg.code === '22P02' || pg.code === '22003') return MESSAGES.invalid
  console.error('[record]', e)
  return MESSAGES.failed
}

async function loadOwned(table: AnyTable, id: string, patientId: string, userId: string) {
  const { db } = clients()
  const idCol = table.id
  const where = table === TABLES.patient ? eq(idCol, id) : and(eq(idCol, id), eq((table as typeof TABLES.visit).patientId, patientId))
  const [row] = await db.select().from(table as typeof TABLES.visit).where(where).limit(1)
  if (!row) return { error: MESSAGES.notFound }
  if (row.cancelledAt) return { error: MESSAGES.cancelled }
  if (row.createdBy !== userId) return { error: MESSAGES.notOwner }
  return { row: row as Record<string, unknown> }
}

// Values written for each kind come from the schema output (an allowlist):
// a loaded row is never spread back, so created_* etc. are never sent.
// Technique scores are recomputed here from the results and the snapshot.
function columns(kind: RecordKind, v: Record<string, unknown>, existing: Record<string, unknown> | null): Record<string, unknown> | { error: FormErrors } {
  if (kind !== 'tech') return v
  const device = v.device as Device
  const stored = existing && existing.device === device ? (existing.steps as AssessedStep[]) : null
  const base = stored ?? buildStepSnapshot(device)
  const { results, ...rest } = v as { results: AssessedStep['result'][] }
  if (results.length !== base.length) return { error: { results: 'จำนวนขั้นตอนไม่ตรงกับอุปกรณ์ โหลดฟอร์มใหม่' } }
  const steps = base.map((st, i) => ({ text: st.text, critical: st.critical, result: results[i] }))
  const score = scoreTechnique(steps)
  return { ...rest, steps, scorePct: score.pct, criticalAllPassed: score.criticalAllPassed }
}

export async function saveRecord(input: { hn: string; kind: string; id?: string; values: unknown; back?: Back }): Promise<SaveResult> {
  const user = await requireUser()
  if (!isRecordKind(input.kind)) return { message: MESSAGES.failed }
  const kind = input.kind
  const patient = await findActivePatientByHn(input.hn)
  if (!patient) return { message: MESSAGES.noPatient }

  const parsed = SCHEMAS[kind](bangkokDate()).safeParse(input.values)
  if (!parsed.success) return { errors: formErrors(parsed.error) }

  const table = TABLES[kind]
  const id = kind === 'patient' ? patient.id : input.id
  let existing: Record<string, unknown> | null = null
  if (id) {
    const owned = await loadOwned(table, id, patient.id, user.id)
    if (owned.error) return { message: owned.error }
    existing = owned.row!
  } else if (kind === 'patient') {
    return { message: MESSAGES.failed }
  }

  const values = columns(kind, parsed.data as Record<string, unknown>, existing)
  if ('error' in values) return { errors: values.error as FormErrors }

  try {
    await withActor(user, async (tx) => {
      const t = table as typeof TABLES.visit
      if (id) {
        // A no-op update returns no row (the trigger skips it); that is fine.
        await tx.update(t).set(values).where(kind === 'patient' ? eq(t.id, id) : and(eq(t.id, id), eq(t.patientId, patient.id)))
      } else {
        await tx.insert(t).values({ ...values, patientId: patient.id } as typeof t.$inferInsert)
      }
    })
  } catch (e) {
    return { message: dbMessage(e) }
  }
  redirect(patientHref(patient.hn, { tab: input.back?.tab, clinic: input.back?.clinic }))
}

export async function cancelRecord(input: { hn: string; kind: string; id: string; reason: string; back?: Back }): Promise<SaveResult> {
  const user = await requireUser()
  if (!isRecordKind(input.kind)) return { message: MESSAGES.failed }
  const kind = input.kind
  const parsed = cancelSchema.safeParse({ reason: input.reason })
  if (!parsed.success) return { errors: formErrors(parsed.error) }
  const patient = await findActivePatientByHn(input.hn)
  if (!patient) return { message: MESSAGES.noPatient }

  const table = TABLES[kind]
  const id = kind === 'patient' ? patient.id : input.id
  const owned = await loadOwned(table, id, patient.id, user.id)
  if (owned.error) return { message: owned.error }

  // Cancelling a registration hides every record under it, including other
  // pharmacists'; only allow it once nothing live is left.
  if (kind === 'patient') {
    const counts = await careCounts(patient.id)
    if (Object.values(counts).some((n) => n > 0)) return { message: MESSAGES.liveRecords }
  }

  try {
    await withActor(user, async (tx) => {
      const t = table as typeof TABLES.visit
      await tx.update(t).set({ cancelledAt: new Date(), cancelReason: parsed.data.reason }).where(eq(t.id, id))
    })
  } catch (e) {
    return { message: dbMessage(e) }
  }
  redirect(kind === 'patient' ? '/' : patientHref(patient.hn, { tab: input.back?.tab, clinic: input.back?.clinic }))
}
