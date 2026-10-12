import { buildStepSnapshot, type Device } from '@/lib/checklists'
import type { AssessedStep } from '@/lib/calc/technique'
import type { NaranjoAnswers } from '@/lib/calc/naranjo'
import { DEFAULT_INR_RANGE } from '@/lib/calc/targets'
import { fullName } from '@/lib/patients/name'
import type { RecordKind } from './schemas'

// Initial form state (all strings / arrays, as the controlled inputs hold them)
// for a new record or from a stored row (Drizzle camelCase).

type Row = Record<string, unknown>
const s = (v: unknown) => (v == null ? '' : String(v))
const arr = <T = string>(v: unknown) => (Array.isArray(v) ? (v as T[]) : [])

export type MedRecRow = { drug: string; ordered: string; actual: string; status: '' | 'match' | 'mismatch' }

export function visitValues(row: Row | null, ctx: { today: string; clinic: string | null; lastMedRec: MedRecRow[] }) {
  return {
    date: row ? s(row.date) : ctx.today,
    clinicCode: row ? s(row.clinicCode) : (ctx.clinic ?? ''),
    sbp: s(row?.sbp),
    dbp: s(row?.dbp),
    fbs: s(row?.fbs),
    a1c: s(row?.a1c),
    ldl: s(row?.ldl),
    scr: s(row?.scr),
    adherencePct: s(row?.adherencePct),
    adherenceMethods: arr(row?.adherenceMethods),
    // New visit: carry the drug list over, the pharmacist re-checks each line.
    medRec: row
      ? arr<MedRecRow>(row.medRec)
      : ctx.lastMedRec.map((r) => ({ drug: r.drug, ordered: r.ordered, actual: '', status: '' as const })),
    soapS: s(row?.soapS),
    soapO: s(row?.soapO),
    soapA: s(row?.soapA),
    soapP: s(row?.soapP),
  }
}
export type VisitValues = ReturnType<typeof visitValues>

export function drpValues(row: Row | null, today: string) {
  return {
    date: row ? s(row.date) : today,
    drug: s(row?.drug),
    category: s(row?.category),
    nccMerp: s(row?.nccMerp),
    detail: s(row?.detail),
    interventions: arr(row?.interventions),
    recommendation: s(row?.recommendation),
    acceptance: s(row?.acceptance),
    outcome: row ? s(row.outcome) : 'pending',
    outcomeDate: s(row?.outcomeDate),
    followUpNote: s(row?.followUpNote),
  }
}
export type DrpValues = ReturnType<typeof drpValues>

export function halValues(row: Row | null, today: string) {
  return {
    date: row ? s(row.date) : today,
    drug: row ? s(row.drug) : 'warfarin',
    drugOther: s(row?.drugOther),
    indication: s(row?.indication),
    parameter: row ? s(row.parameter) : 'INR',
    value: s(row?.value),
    targetLow: row ? s(row.targetLow) : String(DEFAULT_INR_RANGE.low),
    targetHigh: row ? s(row.targetHigh) : String(DEFAULT_INR_RANGE.high),
    dose: s(row?.dose),
    events: arr(row?.events),
    factors: arr(row?.factors),
    action: s(row?.action),
    plan: s(row?.plan),
  }
}
export type HalValues = ReturnType<typeof halValues>

export function adrValues(row: Row | null, today: string) {
  const answers = arr<string | null>(row?.naranjoAnswers)
  return {
    date: row ? s(row.date) : today,
    drug: s(row?.drug),
    drugStartDate: s(row?.drugStartDate),
    reaction: s(row?.reaction),
    type: s(row?.type),
    severity: s(row?.severity),
    seriousness: s(row?.seriousness),
    naranjo: (answers.length === 10 ? answers : Array(10).fill(null)) as NaranjoAnswers as (string | null)[],
    management: arr(row?.management),
    managementNote: s(row?.managementNote),
    result: s(row?.result),
    actions: arr(row?.actions),
  }
}
export type AdrValues = ReturnType<typeof adrValues>

export function techValues(row: Row | null, today: string) {
  const device = row ? (s(row.device) as Device) : ('pen' as Device)
  const steps = row ? arr<AssessedStep>(row.steps) : buildStepSnapshot(device)
  return {
    date: row ? s(row.date) : today,
    device,
    drug: s(row?.drug),
    phase: s(row?.phase),
    drugUser: s(row?.drugUser),
    // The stored snapshot when editing, so step texts stay what was assessed.
    steps: steps.map((st) => ({ text: st.text, critical: st.critical })),
    results: steps.map((st) => st.result),
    education: arr(row?.education),
    problem: s(row?.problem),
    advice: s(row?.advice),
    aids: s(row?.aids),
  }
}
export type TechValues = ReturnType<typeof techValues>

export function patientValues(row: Row) {
  return {
    fullName: fullName({ prefix: (row.prefix as string) ?? null, firstName: s(row.firstName), lastName: s(row.lastName) }),
    sex: s(row.sex),
    birthDate: s(row.birthDate),
    birthDateEstimated: row.birthDateEstimated === true,
    weightKg: s(row.weightKg),
    mainClinicCode: s(row.mainClinicCode),
    conditions: arr(row.conditions),
    allergySummary: s(row.allergySummary),
    goalA1c: s(row.goalA1c),
    goalSbp: s(row.goalSbp),
    goalDbp: s(row.goalDbp),
    goalLdl: s(row.goalLdl),
    note: s(row.note),
  }
}
export type PatientValues = ReturnType<typeof patientValues>

export type AnyValues = VisitValues | DrpValues | HalValues | AdrValues | TechValues | PatientValues
export type ValuesOf<K extends RecordKind> = K extends 'visit'
  ? VisitValues
  : K extends 'drp'
    ? DrpValues
    : K extends 'hal'
      ? HalValues
      : K extends 'adr'
        ? AdrValues
        : K extends 'tech'
          ? TechValues
          : PatientValues
