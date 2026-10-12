// Calendar-date helpers on 'YYYY-MM-DD' strings (Postgres `date`), free of time zones.

function parts(d: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
  if (!m) throw new Error(`invalid date: ${d}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function dayNumber(d: string): number {
  const [y, m, day] = parts(d)
  return Date.UTC(y, m - 1, day) / 86_400_000
}

export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

// Completed years on `on` (birthday not yet reached → one less).
export function ageOn(birthDate: string | null | undefined, on: string): number | null {
  if (!birthDate) return null
  const [by, bm, bd] = parts(birthDate)
  const [y, m, d] = parts(on)
  let age = y - by
  if (m < bm || (m === bm && d < bd)) age--
  return age
}
