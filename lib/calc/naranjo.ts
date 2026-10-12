import type { NARANJO_ANSWER } from '@/lib/codes'

export type NaranjoAnswer = keyof typeof NARANJO_ANSWER
// One entry per question; null = not answered yet (scores like "unknown").
export type NaranjoAnswers = readonly (NaranjoAnswer | null)[]

export const NARANJO_QUESTIONS = [
  { text: 'เคยมีรายงานสรุปแน่ชัดถึงปฏิกิริยานี้มาก่อน', yes: 1, no: 0, unknown: 0 },
  { text: 'อาการเกิดขึ้นหลังได้รับยาที่สงสัย', yes: 2, no: -1, unknown: 0 },
  { text: 'อาการดีขึ้นเมื่อหยุดยาหรือได้ยาต้านจำเพาะ', yes: 1, no: 0, unknown: 0 },
  { text: 'อาการกลับมาเมื่อได้รับยาซ้ำ', yes: 2, no: -1, unknown: 0 },
  { text: 'มีสาเหตุอื่น (นอกจากยา) ที่อธิบายอาการได้', yes: -1, no: 2, unknown: 0 },
  { text: 'อาการเกิดขึ้นเมื่อได้ยาหลอก', yes: -1, no: 1, unknown: 0 },
  { text: 'ตรวจพบระดับยาในเลือดในระดับที่เป็นพิษ', yes: 1, no: 0, unknown: 0 },
  { text: 'อาการรุนแรงขึ้นเมื่อเพิ่มขนาดยา หรือลดลงเมื่อลดขนาดยา', yes: 1, no: 0, unknown: 0 },
  { text: 'ผู้ป่วยเคยมีอาการคล้ายกันจากยานี้หรือยาคล้ายกันมาก่อน', yes: 1, no: 0, unknown: 0 },
  { text: 'ยืนยันอาการด้วยหลักฐานที่วัดได้ (objective evidence)', yes: 1, no: 0, unknown: 0 },
] as const

export function naranjoScore(answers: NaranjoAnswers): number {
  return NARANJO_QUESTIONS.reduce((sum, q, i) => {
    const a = answers[i]
    return sum + (a ? q[a] : 0)
  }, 0)
}

export function naranjoAnswered(answers: NaranjoAnswers): number {
  return NARANJO_QUESTIONS.filter((_, i) => answers[i] != null).length
}

export const NARANJO_CATEGORY = {
  definite: 'ใช่แน่นอน (definite)',
  probable: 'น่าจะใช่ (probable)',
  possible: 'อาจจะใช่ (possible)',
  doubtful: 'น่าสงสัย (doubtful)',
} as const

export type NaranjoCategory = keyof typeof NARANJO_CATEGORY

// ≥9 definite, 5–8 probable, 1–4 possible, ≤0 doubtful
export function naranjoCategory(score: number): NaranjoCategory {
  if (score >= 9) return 'definite'
  if (score >= 5) return 'probable'
  if (score >= 1) return 'possible'
  return 'doubtful'
}
