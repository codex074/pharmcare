// "At target" against the patient's own goals (columns on patients).

export const DEFAULT_GOALS = { a1c: 7, sbp: 140, dbp: 90, ldl: 100 } as const
export const DEFAULT_INR_RANGE = { low: 2, high: 3 } as const

export type Goals = { a1c: number; sbp: number; dbp: number; ldl: number }

export const a1cAtTarget = (a1c: number, goals: Goals) => a1c < goals.a1c

// DBP is optional on a visit; SBP alone decides when it is missing.
export const bpAtTarget = (sbp: number, dbp: number | null | undefined, goals: Goals) =>
  sbp < goals.sbp && (dbp == null || dbp < goals.dbp)

export const ldlAtTarget = (ldl: number, goals: Goals) => ldl < goals.ldl

// Inclusive at both ends.
export const inRange = (value: number, low: number, high: number) => value >= low && value <= high
