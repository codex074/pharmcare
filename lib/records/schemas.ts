import { z } from 'zod'
import * as C from '@/lib/codes'
import { NARANJO_QUESTIONS, naranjoScore, type NaranjoAnswer } from '@/lib/calc/naranjo'
import { parseFullName } from '@/lib/patients/name'

// Form validation shared by the panels (client) and saveRecord (server).
// Inputs arrive as strings from controlled fields; outputs are typed values.
// Built per call with `today` (Bangkok) so "not in the future" is exact.
// Derived values (Naranjo score, technique score) are never taken from input.

type Ctx = z.RefinementCtx

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `ไม่เกิน ${max} ตัวอักษร`)
    .transform((v) => v || null)
const required = (max: number, msg = 'จำเป็นต้องกรอก') => z.string().trim().min(1, msg).max(max, `ไม่เกิน ${max} ตัวอักษร`)

// '' → null; otherwise a number in [min, max] with at most `dp` decimals.
function num(min: number, max: number, dp = 0) {
  return z.string().transform((raw, ctx: Ctx) => {
    const v = raw.trim().replace(',', '.')
    if (!v) return null
    const n = Number(v)
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: 'custom', message: 'กรอกเป็นตัวเลข' })
      return z.NEVER
    }
    if (n < min || n > max) {
      ctx.addIssue({ code: 'custom', message: `ค่าที่รับได้คือ ${min}–${max} ตรวจหน่วยและตัวเลขอีกครั้ง` })
      return z.NEVER
    }
    const decimals = (v.split('.')[1] ?? '').length
    if (decimals > dp) {
      ctx.addIssue({ code: 'custom', message: dp === 0 ? 'กรอกเป็นจำนวนเต็ม' : `ทศนิยมไม่เกิน ${dp} ตำแหน่ง` })
      return z.NEVER
    }
    return n
  })
}
const reqNum = (min: number, max: number, dp = 0) =>
  num(min, max, dp).refine((v) => v != null, 'จำเป็นต้องกรอก') as unknown as z.ZodType<number, string>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const date = (today: string) =>
  z
    .string()
    .trim()
    .refine((v) => DATE_RE.test(v), 'เลือกวันที่')
    .refine((v) => v <= today, 'วันที่อยู่ในอนาคต')
const optDate = (today: string) =>
  z
    .string()
    .trim()
    .refine((v) => !v || DATE_RE.test(v), 'วันที่ไม่ถูกต้อง')
    .refine((v) => !v || v <= today, 'วันที่อยู่ในอนาคต')
    .transform((v) => v || null)

const oneOf = <T extends Record<string, string>>(o: T, msg = 'เลือกหนึ่งข้อ') => z.enum(C.codesOf(o) as [keyof T & string], { error: msg })
const optOneOf = <T extends Record<string, string>>(o: T) =>
  z.union([z.enum(C.codesOf(o) as [keyof T & string]), z.literal('').transform(() => null)])
const manyOf = <T extends Record<string, string>>(o: T) => z.array(z.enum(C.codesOf(o) as [keyof T & string]))

// ---------------------------------------------------------------- Visit

export const medRecRow = z.object({
  drug: z.string().trim().max(200),
  ordered: z.string().trim().max(200),
  actual: z.string().trim().max(200),
  status: z.union([oneOf(C.MED_REC_STATUS, 'เลือกสถานะ'), z.literal('')]),
})

export const visitSchema = (today: string) =>
  z
    .object({
      date: date(today),
      clinicCode: z.string().trim().max(40),
      sbp: num(50, 300),
      dbp: num(30, 200),
      fbs: num(20, 800),
      a1c: num(3, 20, 1),
      ldl: num(10, 500),
      scr: num(0.1, 20, 2),
      adherencePct: num(0, 120),
      adherenceMethods: manyOf(C.ADHERENCE_METHOD),
      // Blank rows are dropped; a row with a drug needs a status. Checked on the
      // field so its errors show alongside the others.
      medRec: z
        .array(medRecRow)
        .max(60)
        .transform((all, ctx) => {
          const rows = all.filter((r) => r.drug || r.ordered || r.actual)
          rows.forEach((r, i) => {
            if (!r.drug) ctx.addIssue({ code: 'custom', message: `แถวที่ ${i + 1}: กรอกชื่อยา` })
            else if (!r.status) ctx.addIssue({ code: 'custom', message: `แถวที่ ${i + 1}: เลือกว่าตรงหรือไม่ตรง` })
          })
          if (!rows.length) ctx.addIssue({ code: 'custom', message: 'บันทึกรายการยาที่ใช้จริงอย่างน้อย 1 รายการ' })
          return rows as { drug: string; ordered: string; actual: string; status: keyof typeof C.MED_REC_STATUS }[]
        }),
      soapS: text(4000),
      soapO: text(4000),
      soapA: text(4000),
      soapP: text(4000),
    })
    .transform((v, ctx) => {
      if (v.sbp != null && v.dbp != null && v.dbp >= v.sbp) ctx.addIssue({ code: 'custom', path: ['dbp'], message: 'DBP ต้องต่ำกว่า SBP' })
      const clinicCode = v.clinicCode || null
      return {
        ...v,
        clinicCode,
        clinicName: clinicCode && clinicCode in C.CLINIC ? C.CLINIC[clinicCode as keyof typeof C.CLINIC] : null,
      }
    })

// ---------------------------------------------------------------- DRP

export const drpSchema = (today: string) =>
  z
    .object({
      date: date(today),
      drug: text(300),
      category: oneOf(C.DRP_CATEGORY, 'เลือกประเภทปัญหา'),
      nccMerp: optOneOf(C.NCC_MERP),
      detail: required(4000, 'กรอกรายละเอียดปัญหา'),
      interventions: manyOf(C.DRP_INTERVENTION).min(1, 'เลือกการแก้ไขอย่างน้อย 1 ข้อ'),
      recommendation: text(4000),
      acceptance: oneOf(C.DRP_ACCEPTANCE, 'เลือกการตอบรับของแพทย์'),
      outcome: oneOf(C.DRP_OUTCOME, 'เลือกผลลัพธ์'),
      outcomeDate: optDate(today),
      followUpNote: text(4000),
    })
    .transform((v, ctx) => {
      const outcomeDate = v.outcome === 'pending' ? v.outcomeDate : (v.outcomeDate ?? today)
      if (outcomeDate && outcomeDate < v.date) ctx.addIssue({ code: 'custom', path: ['outcomeDate'], message: 'วันที่ประเมินผลต้องไม่ก่อนวันที่พบปัญหา' })
      return { ...v, outcomeDate }
    })

// ---------------------------------------------------------------- High-alert drug monitoring

export const halSchema = (today: string) =>
  z
    .object({
      date: date(today),
      drug: oneOf(C.HIGH_ALERT_DRUG, 'เลือกยา'),
      drugOther: text(200),
      indication: text(300),
      parameter: required(60, 'ระบุค่าที่ติดตาม'),
      value: reqNum(0, 5000, 2),
      targetLow: reqNum(0, 5000, 2),
      targetHigh: reqNum(0, 5000, 2),
      dose: text(300),
      events: manyOf(C.HIGH_ALERT_EVENT),
      factors: manyOf(C.HIGH_ALERT_FACTOR),
      action: oneOf(C.HIGH_ALERT_ACTION, 'เลือกการจัดการ'),
      plan: text(4000),
    })
    .superRefine((v, ctx) => {
      if (v.drug === 'other' && !v.drugOther) ctx.addIssue({ code: 'custom', path: ['drugOther'], message: 'ระบุชื่อยา' })
      if (v.targetLow != null && v.targetHigh != null && v.targetLow >= v.targetHigh)
        ctx.addIssue({ code: 'custom', path: ['targetHigh'], message: 'ค่าสูงสุดต้องมากกว่าค่าต่ำสุด' })
    })
    .transform((v) => ({ ...v, drugOther: v.drug === 'other' ? v.drugOther : null }))

// ---------------------------------------------------------------- ADR

const naranjoAnswer = z.union([z.enum(['yes', 'no', 'unknown']), z.null()])

export const adrSchema = (today: string) =>
  z
    .object({
      date: date(today),
      drug: required(300, 'ระบุยาที่สงสัย'),
      drugStartDate: optDate(today),
      reaction: required(2000, 'ระบุอาการที่พบ'),
      type: oneOf(C.ADR_TYPE, 'เลือกชนิด'),
      severity: oneOf(C.ADR_SEVERITY, 'เลือกความรุนแรง'),
      seriousness: optOneOf(C.ADR_SERIOUSNESS),
      naranjo: z.array(naranjoAnswer).length(NARANJO_QUESTIONS.length),
      management: manyOf(C.ADR_MANAGEMENT),
      managementNote: text(4000),
      result: optOneOf(C.ADR_RESULT),
      actions: manyOf(C.ADR_ACTION),
    })
    .superRefine((v, ctx) => {
      if (v.drugStartDate && v.drugStartDate > v.date)
        ctx.addIssue({ code: 'custom', path: ['drugStartDate'], message: 'วันที่เริ่มยาต้องไม่หลังวันที่เกิดอาการ' })
    })
    .transform(({ naranjo, ...v }) => {
      const answered = naranjo.some((a) => a != null)
      return {
        ...v,
        naranjoAnswers: answered ? (naranjo as (NaranjoAnswer | null)[]) : null,
        naranjoScore: answered ? naranjoScore(naranjo) : null,
      }
    })

// ---------------------------------------------------------------- Technique

export const techSchema = (today: string) =>
  z.object({
    date: date(today),
    device: oneOf(C.DEVICE, 'เลือกอุปกรณ์'),
    drug: required(200, 'ระบุชื่อยา'),
    phase: oneOf(C.TECHNIQUE_PHASE, 'เลือกรอบการประเมิน'),
    drugUser: optOneOf(C.DRUG_USER),
    results: z.array(z.union([z.enum(['pass', 'fail']), z.null()])).min(1).max(30),
    education: z.array(z.string().trim().min(1).max(300)).max(20),
    problem: text(4000),
    advice: text(4000),
    aids: text(300),
  })

// ---------------------------------------------------------------- Patient (owner edits)

export const PATIENT_CONDITIONS = [
  'เบาหวานชนิดที่ 2', 'เบาหวานชนิดที่ 1', 'ความดันโลหิตสูง', 'ไขมันในเลือดสูง', 'ไตเรื้อรัง',
  'หืด', 'COPD', 'AF', 'ลิ้นหัวใจเทียม', 'VTE', 'หัวใจล้มเหลว',
] as const

export const patientSchema = (today: string) =>
  z
    .object({
      fullName: required(200, 'กรอกชื่อ-สกุล').refine((v) => parseFullName(v) != null, 'กรอกทั้งชื่อและนามสกุล เว้นวรรคระหว่างกัน'),
      sex: optOneOf(C.SEX),
      birthDate: optDate(today),
      birthDateEstimated: z.boolean(),
      weightKg: num(2, 300, 1),
      mainClinicCode: optOneOf(C.CLINIC),
      conditions: z.array(z.enum(PATIENT_CONDITIONS)),
      allergySummary: text(500),
      goalA1c: reqNum(5, 10, 1),
      goalSbp: reqNum(100, 180),
      goalDbp: reqNum(60, 110),
      goalLdl: reqNum(40, 190),
      note: text(4000),
    })
    .transform(({ fullName, ...v }) => {
      const n = parseFullName(fullName)!
      return {
        ...v,
        prefix: n.prefix,
        firstName: n.firstName,
        lastName: n.lastName,
        birthDateEstimated: v.birthDate ? v.birthDateEstimated : false,
        mainClinicName: v.mainClinicCode ? C.CLINIC[v.mainClinicCode] : null,
      }
    })

// ---------------------------------------------------------------- Cancel

export const cancelSchema = z.object({ reason: required(500, 'ระบุเหตุผลที่ยกเลิก') })

// ---------------------------------------------------------------- helpers

export const SCHEMAS = { visit: visitSchema, drp: drpSchema, hal: halSchema, adr: adrSchema, tech: techSchema, patient: patientSchema }
export type RecordKind = keyof typeof SCHEMAS
export type FormErrors = Record<string, string>

export function formErrors(error: z.ZodError): FormErrors {
  const out: FormErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
