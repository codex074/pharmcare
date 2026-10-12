import { z } from 'zod'
import { codesOf, SEX } from '@/lib/codes'
import { hnError, normalizeHn } from './hn'
import { parseFullName } from './name'

// Shared by the registration form (client) and registerPatient (server).

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `ไม่เกิน ${max} ตัวอักษร`)
    .transform((v) => v || null)

export const registerSchema = z.object({
  hn: z
    .string()
    .transform(normalizeHn)
    .superRefine((hn, ctx) => {
      const err = hnError(hn)
      if (err) ctx.addIssue({ code: 'custom', message: err })
    }),
  fullName: z
    .string()
    .trim()
    .min(1, 'กรอกชื่อ-สกุล')
    .max(200)
    .refine((v) => parseFullName(v) != null, 'กรอกทั้งชื่อและนามสกุล เว้นวรรคระหว่างกัน'),
  sex: z.enum(codesOf(SEX), { error: 'เลือกเพศ' }),
  age: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0 || n > 120) {
        ctx.addIssue({ code: 'custom', message: 'อายุเป็นจำนวนเต็ม 0–120 ปี' })
        return z.NEVER
      }
      return n
    }),
  clinic: optionalText(100),
  allergy: optionalText(500),
})

export type RegisterInput = z.input<typeof registerSchema>
export type RegisterValues = z.output<typeof registerSchema>
export type FieldErrors = Partial<Record<keyof RegisterInput, string>>

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof RegisterInput | undefined
    if (key && !out[key]) out[key] = issue.message
  }
  return out
}

// Estimated birth date from a typed age: 1 January of (this Bangkok year − age),
// so the age shown today equals what was typed.
export function birthDateFromAge(age: number, todayBangkok: string): string {
  const year = Number(todayBangkok.slice(0, 4)) - age
  return `${String(year).padStart(4, '0')}-01-01`
}
