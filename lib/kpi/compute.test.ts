import { describe, expect, it } from 'vitest'
import { DEFAULT_GOALS } from '@/lib/calc/targets'
import { computeKpis, type KpiInput } from './compute'

const base: KpiInput = { from: null, visits: [], drps: [], hal: [], adrs: [], techs: [], goals: new Map() }
const v = (patientId: string, date: string, x: Partial<KpiInput['visits'][number]> = {}) => ({ patientId, date, sbp: null, dbp: null, a1c: null, ldl: null, ...x })
const drp = (date: string, acceptance: string, outcome: string, category = 'nonadherence') => ({ patientId: 'p1', date, category, acceptance, outcome })

describe('computeKpis', () => {
  it('counts acceptance only over consulted-and-answered DRPs and resolution only over closed ones', () => {
    const k = computeKpis({
      ...base,
      drps: [
        drp('2026-10-01', 'accepted', 'resolved'),
        drp('2026-10-01', 'partial', 'partial'),
        drp('2026-10-01', 'rejected', 'unresolved'),
        drp('2026-10-01', 'pending', 'pending'),
        drp('2026-10-01', 'not_needed', 'pending'),
      ],
    })
    expect(k.acceptance).toEqual({ n: 2, d: 3, pct: 66.7 })
    expect(k.resolved).toEqual({ n: 1, d: 3, pct: 33.3 })
    expect(k.byCategory.find((c) => c.code === 'nonadherence')!.n).toBe(5)
  })

  it('filters counts by the record date but uses all-time latest values for outcomes', () => {
    const goals = new Map([
      ['p1', DEFAULT_GOALS],
      ['p2', { ...DEFAULT_GOALS, a1c: 8 }],
    ])
    const k = computeKpis({
      ...base,
      from: '2026-10-01',
      goals,
      visits: [
        v('p1', '2026-01-01', { a1c: 6.5 }),
        v('p1', '2026-06-01', { a1c: 7.4 }), // latest for p1: not at target (< 7)
        v('p2', '2026-10-05', { a1c: 7.4 }), // p2's own goal < 8: at target
      ],
    })
    expect(k.visits).toBe(1)
    expect(k.patients).toBe(1)
    expect(k.a1cAtTarget).toEqual({ n: 1, d: 2, pct: 50 })
  })

  it('averages TTR per patient over all INR results', () => {
    const inr = (date: string, value: number) => ({ patientId: 'p1', date, parameter: ' inr ', value, low: 2, high: 3 })
    const k = computeKpis({
      ...base,
      from: '2026-10-01',
      hal: [inr('2026-06-01', 1.6), inr('2026-06-29', 2.1), inr('2026-07-27', 2.6), inr('2026-08-24', 3.8), inr('2026-09-07', 2.9), inr('2026-10-05', 2.4)],
    })
    expect(k.ttrMean).toBe(58)
    expect(k.inrInRange).toEqual({ n: 1, d: 1, pct: 100 })
  })

  it('compares first and latest technique scores for repeated patient-device pairs', () => {
    const t = (date: string, scorePct: number, criticalAllPassed: boolean, device = 'pen') => ({ patientId: 'p1', date, device, scorePct, criticalAllPassed, createdAt: 0 })
    const k = computeKpis({ ...base, techs: [t('2026-07-01', 60, false), t('2026-10-01', 90, true), t('2026-10-01', 70, false, 'mdi')] })
    expect([k.techniqueFirst, k.techniqueLast, k.techniquePairs]).toEqual([60, 90, 1])
    expect(k.criticalAllPassed).toEqual({ n: 1, d: 2, pct: 50 })
  })

  it('returns empty ratios rather than dividing by zero', () => {
    const k = computeKpis(base)
    expect(k.acceptance.pct).toBeNull()
    expect(k.drpPerVisit).toBeNull()
    expect(k.ttrMean).toBeNull()
  })
})
