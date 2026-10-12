import { a1cAtTarget, bpAtTarget, inRange, ldlAtTarget, type Goals } from '@/lib/calc/targets'
import { ttrRosendaal, type InrPoint } from '@/lib/calc/ttr'
import { DRP_CATEGORY } from '@/lib/codes'

// KPI rules (CLAUDE.md "Domain"): only non-cancelled rows reach here.
// Period-bound counts use each record's own date. Clinical outcomes and TTR
// use every patient's latest values regardless of the selected period.

export const PERIODS = { '30': 30, '90': 90, '365': 365, all: null } as const
export type Period = keyof typeof PERIODS

export type KpiInput = {
  from: string | null // inclusive 'YYYY-MM-DD', null = all time
  visits: { patientId: string; date: string; sbp: number | null; dbp: number | null; a1c: number | null; ldl: number | null }[]
  drps: { patientId: string; date: string; category: string; acceptance: string; outcome: string }[]
  hal: { patientId: string; date: string; parameter: string; value: number; low: number; high: number }[]
  adrs: { patientId: string; date: string }[]
  techs: { patientId: string; date: string; device: string; scorePct: number; criticalAllPassed: boolean; createdAt: number }[]
  goals: Map<string, Goals>
}

export type Ratio = { n: number; d: number; pct: number | null }
const ratio = (n: number, d: number): Ratio => ({ n, d, pct: d ? Math.round((n / d) * 1000) / 10 : null })
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)

export function computeKpis(input: KpiInput) {
  const inPeriod = <T extends { date: string }>(rows: T[]) => (input.from ? rows.filter((r) => r.date >= input.from!) : rows)
  const visits = inPeriod(input.visits)
  const drps = inPeriod(input.drps)
  const hal = inPeriod(input.hal)
  const adrs = inPeriod(input.adrs)
  const techs = inPeriod(input.techs)

  const patients = new Set([...visits, ...drps, ...hal, ...adrs, ...techs].map((r) => r.patientId))

  // Physician acceptance: only DRPs that were consulted and answered.
  const consulted = drps.filter((d) => ['accepted', 'partial', 'rejected'].includes(d.acceptance))
  const accepted = consulted.filter((d) => d.acceptance !== 'rejected')
  // Resolved: only DRPs that are closed.
  const closed = drps.filter((d) => d.outcome !== 'pending')
  const resolved = closed.filter((d) => d.outcome === 'resolved')

  const byCategory = Object.keys(DRP_CATEGORY).map((code) => ({ code, n: drps.filter((d) => d.category === code).length }))

  // Latest value per patient (all time), each metric on its own.
  const latest = <K extends 'a1c' | 'sbp' | 'ldl'>(k: K) => {
    const m = new Map<string, KpiInput['visits'][number]>()
    for (const v of [...input.visits].sort((a, b) => a.date.localeCompare(b.date))) if (v[k] != null) m.set(v.patientId, v)
    return m
  }
  const outcome = (k: 'a1c' | 'sbp' | 'ldl', ok: (v: KpiInput['visits'][number], g: Goals) => boolean) => {
    const rows = [...latest(k).values()]
    return ratio(rows.filter((v) => ok(v, input.goals.get(v.patientId)!)).length, rows.length)
  }

  // TTR per patient over all their INR results.
  const inrByPatient = new Map<string, InrPoint[]>()
  for (const r of input.hal) {
    if (r.parameter.trim().toUpperCase() !== 'INR') continue
    const list = inrByPatient.get(r.patientId) ?? []
    list.push({ date: r.date, value: r.value, low: r.low, high: r.high })
    inrByPatient.set(r.patientId, list)
  }
  const ttrs = [...inrByPatient.values()].map(ttrRosendaal).filter((t): t is number => t != null)
  const inrInPeriod = hal.filter((r) => r.parameter.trim().toUpperCase() === 'INR')

  // Technique: patient-device pairs within the period, oldest first.
  const pairs = new Map<string, KpiInput['techs']>()
  for (const t of [...techs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)) {
    const key = `${t.patientId}|${t.device}`
    pairs.set(key, [...(pairs.get(key) ?? []), t])
  }
  const repeated = [...pairs.values()].filter((a) => a.length > 1)
  const lastOfPair = [...pairs.values()].map((a) => a.at(-1)!)

  return {
    patients: patients.size,
    visits: visits.length,
    drps: drps.length,
    drpPerVisit: visits.length ? Math.round((drps.length / visits.length) * 100) / 100 : null,
    acceptance: ratio(accepted.length, consulted.length),
    resolved: ratio(resolved.length, closed.length),
    adrs: adrs.length,
    byCategory,
    a1cAtTarget: outcome('a1c', (v, g) => a1cAtTarget(v.a1c!, g)),
    bpAtTarget: outcome('sbp', (v, g) => bpAtTarget(v.sbp!, v.dbp, g)),
    ldlAtTarget: outcome('ldl', (v, g) => ldlAtTarget(v.ldl!, g)),
    ttrMean: avg(ttrs),
    ttrPatients: ttrs.length,
    inrInRange: ratio(inrInPeriod.filter((r) => inRange(r.value, r.low, r.high)).length, inrInPeriod.length),
    techniques: techs.length,
    techniqueFirst: avg(repeated.map((a) => a[0].scorePct)),
    techniqueLast: avg(repeated.map((a) => a.at(-1)!.scorePct)),
    techniquePairs: repeated.length,
    criticalAllPassed: ratio(lastOfPair.filter((t) => t.criticalAllPassed).length, lastOfPair.length),
  }
}

export type Kpis = ReturnType<typeof computeKpis>
