import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { ageOn, daysBetween } from '@/lib/calc/dates'
import { egfrCkdEpi2021, type Sex } from '@/lib/calc/egfr'
import { a1cAtTarget, bpAtTarget, inRange, ldlAtTarget, type Goals } from '@/lib/calc/targets'
import { ttrRosendaal } from '@/lib/calc/ttr'
import { scoreTechnique, type AssessedStep } from '@/lib/calc/technique'
import { clients } from '@/lib/db'
import { adrs, drps, highAlertMonitoring, patients, techniqueAssessments, visits } from '@/lib/db/schema'
import { bangkokDate, TZ } from '@/lib/thai-date'

// Read side of the patient screens. Drizzle returns `date` as 'YYYY-MM-DD'
// strings and our numerics as numbers, which is what lib/calc expects.
// Raw SQL goes through the same client, whose type parsers Drizzle replaces
// (timestamps arrive as strings), so raw queries return timestamps as epoch
// milliseconds and convert them here.

const toDate = (v: number | null) => (v == null ? null : new Date(v))

export type Patient = typeof patients.$inferSelect
export type CareKind = 'visit' | 'drp' | 'hal' | 'adr' | 'tech'

export async function findActivePatientByHn(hn: string): Promise<Patient | null> {
  const { db } = clients()
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.hn, hn), isNull(patients.cancelledAt)))
    .limit(1)
  return row ?? null
}

export function goalsOf(p: Patient): Goals {
  return { a1c: p.goalA1c, sbp: p.goalSbp, dbp: p.goalDbp, ldl: p.goalLdl }
}

export type Metric = { value: string; date: string; ok: boolean | null }

export type Overview = {
  a1c: Metric | null
  bp: Metric | null
  ldl: Metric | null
  egfr: Metric | null
  inr: (Metric & { low: number; high: number; ttr: number | null }) | null
  a1cSeries: { date: string; value: number }[]
  openDrps: (typeof drps.$inferSelect & { daysOpen: number })[]
  technique: { device: string; date: string; pct: number; passed: number; total: number; previousPct: number | null; previousDate: string | null; missedCritical: string[] } | null
  allergies: { drug: string; reaction: string; date: string; naranjoScore: number | null }[]
  counts: Record<CareKind, number>
  lastCareDate: string | null
}

export async function patientOverview(p: Patient): Promise<Overview> {
  const { db } = clients()
  const today = bangkokDate()
  const [visitRows, inrRows, openDrps, techRows, allergyRows, counts] = await Promise.all([
    db
      .select({ date: visits.date, sbp: visits.sbp, dbp: visits.dbp, a1c: visits.a1c, ldl: visits.ldl, scr: visits.scr })
      .from(visits)
      .where(and(eq(visits.patientId, p.id), isNull(visits.cancelledAt)))
      .orderBy(asc(visits.date), asc(visits.createdAt)),
    db
      .select({ date: highAlertMonitoring.date, value: highAlertMonitoring.value, low: highAlertMonitoring.targetLow, high: highAlertMonitoring.targetHigh })
      .from(highAlertMonitoring)
      .where(
        and(
          eq(highAlertMonitoring.patientId, p.id),
          isNull(highAlertMonitoring.cancelledAt),
          sql`upper(btrim(${highAlertMonitoring.parameter})) = 'INR'`,
        ),
      )
      .orderBy(asc(highAlertMonitoring.date), asc(highAlertMonitoring.createdAt)),
    db
      .select()
      .from(drps)
      .where(and(eq(drps.patientId, p.id), isNull(drps.cancelledAt), eq(drps.outcome, 'pending')))
      .orderBy(asc(drps.date)),
    db
      .select({ device: techniqueAssessments.device, date: techniqueAssessments.date, steps: techniqueAssessments.steps })
      .from(techniqueAssessments)
      .where(and(eq(techniqueAssessments.patientId, p.id), isNull(techniqueAssessments.cancelledAt)))
      .orderBy(desc(techniqueAssessments.date), desc(techniqueAssessments.createdAt))
      .limit(20),
    db
      .select({ drug: adrs.drug, reaction: adrs.reaction, date: adrs.date, naranjoScore: adrs.naranjoScore })
      .from(adrs)
      .where(and(eq(adrs.patientId, p.id), isNull(adrs.cancelledAt), eq(adrs.type, 'allergy')))
      .orderBy(desc(adrs.date)),
    careCounts(p.id),
  ])

  const goals = goalsOf(p)
  const latest = <K extends keyof (typeof visitRows)[number]>(k: K) => visitRows.findLast((v) => v[k] != null)
  const a1c = latest('a1c')
  const bp = latest('sbp')
  const ldl = latest('ldl')
  const scr = latest('scr')
  const egfr = scr ? egfrCkdEpi2021(scr.scr, ageOn(p.birthDate, scr.date), p.sex as Sex | null) : null
  const lastInr = inrRows.at(-1)

  let technique: Overview['technique'] = null
  if (techRows.length) {
    const [last, ...older] = techRows
    const prev = older.find((t) => t.device === last.device)
    const steps = last.steps as AssessedStep[]
    const s = scoreTechnique(steps)
    technique = {
      device: last.device,
      date: last.date,
      pct: s.pct,
      passed: s.passed,
      total: s.total,
      previousPct: prev ? scoreTechnique(prev.steps as AssessedStep[]).pct : null,
      previousDate: prev?.date ?? null,
      missedCritical: steps.filter((st) => st.critical && st.result !== 'pass').map((st) => st.text),
    }
  }

  const careDates = [visitRows.at(-1)?.date, lastInr?.date, techRows[0]?.date].filter(Boolean) as string[]

  return {
    a1c: a1c ? { value: String(a1c.a1c), date: a1c.date, ok: a1cAtTarget(a1c.a1c!, goals) } : null,
    bp: bp ? { value: `${bp.sbp}/${bp.dbp ?? '–'}`, date: bp.date, ok: bpAtTarget(bp.sbp!, bp.dbp, goals) } : null,
    ldl: ldl ? { value: String(ldl.ldl), date: ldl.date, ok: ldlAtTarget(ldl.ldl!, goals) } : null,
    egfr: scr && egfr != null ? { value: String(egfr), date: scr.date, ok: null } : null,
    inr: lastInr
      ? {
          value: String(lastInr.value),
          date: lastInr.date,
          ok: inRange(lastInr.value, lastInr.low, lastInr.high),
          low: lastInr.low,
          high: lastInr.high,
          ttr: ttrRosendaal(inrRows),
        }
      : null,
    a1cSeries: visitRows.filter((v) => v.a1c != null).map((v) => ({ date: v.date, value: v.a1c! })),
    openDrps: openDrps.map((d) => ({ ...d, daysOpen: daysBetween(d.date, today) })),
    technique,
    allergies: allergyRows,
    counts,
    lastCareDate: careDates.sort().at(-1) ?? null,
  }
}

// Non-cancelled records per care type.
export async function careCounts(patientId: string): Promise<Record<CareKind, number>> {
  const { sql: q } = clients()
  const [row] = await q<Record<CareKind, number>[]>`
    select
      (select count(*) from visits where patient_id = ${patientId} and cancelled_at is null)::int as visit,
      (select count(*) from drps where patient_id = ${patientId} and cancelled_at is null)::int as drp,
      (select count(*) from high_alert_monitoring where patient_id = ${patientId} and cancelled_at is null)::int as hal,
      (select count(*) from adrs where patient_id = ${patientId} and cancelled_at is null)::int as adr,
      (select count(*) from technique_assessments where patient_id = ${patientId} and cancelled_at is null)::int as tech`
  return row
}

export type TimelineRow = {
  kind: CareKind
  id: string
  date: string
  createdAt: Date
  createdByName: string
  cancelledAt: Date | null
  cancelReason: string | null
  cancelledByName: string | null
  // the row as JSON: numerics are JSON numbers, dates 'YYYY-MM-DD' strings
  data: Record<string, unknown>
}

// Every care record of a patient, newest first, cancelled ones included.
export async function patientTimeline(patientId: string): Promise<TimelineRow[]> {
  const { sql: q } = clients()
  const rows = await q<
    {
      kind: CareKind
      id: string
      date: string
      created_at: number
      created_by_name: string
      cancelled_at: number | null
      cancel_reason: string | null
      cancelled_by_name: string | null
      data: Record<string, unknown>
    }[]
  >`
    with care as (
      select 'visit' as kind, id, date, created_at, created_by_name, cancelled_at, cancel_reason, to_jsonb(t) as data
        from visits t where patient_id = ${patientId}
      union all
      select 'drp', id, date, created_at, created_by_name, cancelled_at, cancel_reason, to_jsonb(t)
        from drps t where patient_id = ${patientId}
      union all
      select 'hal', id, date, created_at, created_by_name, cancelled_at, cancel_reason, to_jsonb(t)
        from high_alert_monitoring t where patient_id = ${patientId}
      union all
      select 'adr', id, date, created_at, created_by_name, cancelled_at, cancel_reason, to_jsonb(t)
        from adrs t where patient_id = ${patientId}
      union all
      select 'tech', id, date, created_at, created_by_name, cancelled_at, cancel_reason, to_jsonb(t)
        from technique_assessments t where patient_id = ${patientId}
    )
    select c.kind, c.id, c.date::text as date,
           (extract(epoch from c.created_at) * 1000)::float8 as created_at, c.created_by_name,
           (extract(epoch from c.cancelled_at) * 1000)::float8 as cancelled_at, c.cancel_reason,
           a.actor_name as cancelled_by_name, c.data
      from care c
      left join audit_log a on a.record_id = c.id and a.action = 'cancel'
     order by c.date desc, c.created_at desc
     limit 500`
  return rows.map((r) => ({
    kind: r.kind,
    id: r.id,
    date: r.date,
    createdAt: new Date(r.created_at),
    createdByName: r.created_by_name,
    cancelledAt: toDate(r.cancelled_at),
    cancelReason: r.cancel_reason,
    cancelledByName: r.cancelled_by_name,
    data: r.data,
  }))
}

export type TodayPatient = {
  hn: string
  prefix: string | null
  firstName: string
  lastName: string
  firstAt: Date
  kinds: CareKind[]
  clinicName: string | null
}

// Patients with at least one care record created today (Bangkok).
export async function caredToday(): Promise<TodayPatient[]> {
  const { sql: q } = clients()
  const today = bangkokDate()
  const rows = await q<
    {
      hn: string
      prefix: string | null
      first_name: string
      last_name: string
      first_at: number
      kinds: CareKind[]
      clinic_name: string | null
    }[]
  >`
    with care as (
      select patient_id, 'visit' as kind, created_at, clinic_name from visits where cancelled_at is null
        and (created_at at time zone ${TZ})::date = ${today}::date
      union all
      select patient_id, 'drp', created_at, null from drps where cancelled_at is null
        and (created_at at time zone ${TZ})::date = ${today}::date
      union all
      select patient_id, 'hal', created_at, null from high_alert_monitoring where cancelled_at is null
        and (created_at at time zone ${TZ})::date = ${today}::date
      union all
      select patient_id, 'adr', created_at, null from adrs where cancelled_at is null
        and (created_at at time zone ${TZ})::date = ${today}::date
      union all
      select patient_id, 'tech', created_at, null from technique_assessments where cancelled_at is null
        and (created_at at time zone ${TZ})::date = ${today}::date
    )
    select p.hn, p.prefix, p.first_name, p.last_name, (extract(epoch from min(c.created_at)) * 1000)::float8 as first_at,
           array_agg(distinct c.kind) as kinds,
           coalesce(max(c.clinic_name), p.main_clinic_name) as clinic_name
      from care c join patients p on p.id = c.patient_id
     where p.cancelled_at is null
     group by p.id
     order by first_at
     limit 100`
  return rows.map((r) => ({
    hn: r.hn,
    prefix: r.prefix,
    firstName: r.first_name,
    lastName: r.last_name,
    firstAt: new Date(r.first_at),
    kinds: r.kinds,
    clinicName: r.clinic_name,
  }))
}

export type OpenDrp = {
  id: string
  hn: string
  prefix: string | null
  firstName: string
  lastName: string
  category: string
  nccMerp: string | null
  detail: string
  acceptance: string
  date: string
  daysOpen: number
}

// DRPs still waiting for an outcome, oldest first.
export async function openDrpsAll(limit = 20): Promise<{ rows: OpenDrp[]; total: number }> {
  const { db } = clients()
  const today = bangkokDate()
  const where = and(isNull(drps.cancelledAt), eq(drps.outcome, 'pending'), isNull(patients.cancelledAt))
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: drps.id,
        hn: patients.hn,
        prefix: patients.prefix,
        firstName: patients.firstName,
        lastName: patients.lastName,
        category: drps.category,
        nccMerp: drps.nccMerp,
        detail: drps.detail,
        acceptance: drps.acceptance,
        date: drps.date,
      })
      .from(drps)
      .innerJoin(patients, eq(patients.id, drps.patientId))
      .where(where)
      .orderBy(asc(drps.date))
      .limit(limit),
    db.select({ total: sql<number>`count(*)::int` }).from(drps).innerJoin(patients, eq(patients.id, drps.patientId)).where(where),
  ])
  return { rows: rows.map((r) => ({ ...r, daysOpen: daysBetween(r.date, today) })), total }
}
