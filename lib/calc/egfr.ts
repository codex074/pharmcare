// CKD-EPI 2021 (race-free) creatinine equation, mL/min/1.73 m², rounded.
// Age must be the age at the date of the SCr result (see ageOn).

export type Sex = 'male' | 'female'

export function egfrCkdEpi2021(scrMgDl: number | null | undefined, age: number | null | undefined, sex: Sex | null | undefined): number | null {
  if (scrMgDl == null || !(scrMgDl > 0) || age == null || age < 18 || !sex) return null
  const female = sex === 'female'
  const kappa = female ? 0.7 : 0.9
  const alpha = female ? -0.241 : -0.302
  const ratio = scrMgDl / kappa
  const value =
    142 * Math.min(ratio, 1) ** alpha * Math.max(ratio, 1) ** -1.2 * 0.9938 ** age * (female ? 1.012 : 1)
  return Math.round(value)
}
