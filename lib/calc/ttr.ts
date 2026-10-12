import { daysBetween } from './dates'

// Time in therapeutic range, Rosendaal linear interpolation.
// Each day between two consecutive results gets an interpolated value, judged
// against the later result's target range. Gaps over 56 days are skipped.

export const TTR_MAX_GAP_DAYS = 56

export type InrPoint = { date: string; value: number; low: number; high: number }

export function ttrRosendaal(points: readonly InrPoint[]): number | null {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  let inRange = 0
  let total = 0
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]
    const b = sorted[i]
    const gap = daysBetween(a.date, b.date)
    if (gap <= 0 || gap > TTR_MAX_GAP_DAYS) continue
    for (let k = 1; k <= gap; k++) {
      const v = a.value + ((b.value - a.value) * k) / gap
      if (v >= b.low && v <= b.high) inRange++
      total++
    }
  }
  return total ? Math.round((inRange / total) * 100) : null
}
