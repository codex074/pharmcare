import { describe, expect, it } from 'vitest'
import { buildStepSnapshot, CHECKLISTS, educationTopics, type Device } from '@/lib/checklists'
import { DEVICE } from '@/lib/codes'
import { ageOn, daysBetween } from './dates'
import { egfrCkdEpi2021 } from './egfr'
import { NARANJO_QUESTIONS, naranjoAnswered, naranjoCategory, naranjoScore, type NaranjoAnswers } from './naranjo'
import { a1cAtTarget, bpAtTarget, DEFAULT_GOALS, inRange, ldlAtTarget } from './targets'
import { scoreTechnique, type AssessedStep } from './technique'
import { ttrRosendaal, type InrPoint } from './ttr'

// Expected values below come from running the prototype's own data.js
// functions on the same inputs (example patient HN 6900002, fictional).

describe('dates', () => {
  it('counts calendar days without time-zone drift', () => {
    expect(daysBetween('2026-06-01', '2026-06-29')).toBe(28)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
  })

  it('gives completed years at a date', () => {
    expect(ageOn('1955-11-02', '2026-10-05')).toBe(70)
    expect(ageOn('1955-11-02', '2026-11-02')).toBe(71)
    expect(ageOn('1955-11-02', '2026-11-01')).toBe(70)
    expect(ageOn(null, '2026-10-05')).toBeNull()
  })
})

describe('eGFR CKD-EPI 2021', () => {
  it.each([
    [1.3, 70, 'male', 59], // HN 6900002, visit 2026-10-05
    [1.3, 70, 'female', 44],
    [0.6, 30, 'female', 124],
    [0.8, 50, 'male', 108],
  ] as const)('SCr %s, %s y, %s → %s', (scr, age, sex, expected) => {
    expect(egfrCkdEpi2021(scr, age, sex)).toBe(expected)
  })

  it('returns null when an input is missing or the patient is not an adult', () => {
    expect(egfrCkdEpi2021(null, 70, 'male')).toBeNull()
    expect(egfrCkdEpi2021(1.3, null, 'male')).toBeNull()
    expect(egfrCkdEpi2021(1.3, 70, null)).toBeNull()
    expect(egfrCkdEpi2021(0, 70, 'male')).toBeNull()
    expect(egfrCkdEpi2021(0.5, 12, 'male')).toBeNull()
  })
})

describe('TTR Rosendaal', () => {
  const r = (date: string, value: number): InrPoint => ({ date, value, low: 2, high: 3 })
  const hn6900002 = [
    r('2026-06-01', 1.6),
    r('2026-06-29', 2.1),
    r('2026-07-27', 2.6),
    r('2026-08-24', 3.8),
    r('2026-09-07', 2.9),
    r('2026-10-05', 2.4),
  ]

  it('matches the prototype for HN 6900002', () => {
    expect(ttrRosendaal(hn6900002)).toBe(58)
  })

  it('does not depend on input order', () => {
    expect(ttrRosendaal([...hn6900002].reverse())).toBe(58)
  })

  it('needs at least two results', () => {
    expect(ttrRosendaal([])).toBeNull()
    expect(ttrRosendaal([r('2026-06-01', 2.5)])).toBeNull()
  })

  it('skips gaps over 56 days and same-day pairs', () => {
    expect(ttrRosendaal([r('2026-01-01', 2.5), r('2026-02-27', 2.5)])).toBeNull() // 57 days
    expect(ttrRosendaal([r('2026-01-01', 2.5), r('2026-02-26', 2.5)])).toBe(100) // 56 days
    expect(ttrRosendaal([r('2026-01-01', 2.5), r('2026-01-01', 4)])).toBeNull()
  })

  it('interpolates daily values, inclusive of the range ends', () => {
    // 1.0 → 3.0 over 4 days: 1.5, 2.0, 2.5, 3.0 → 3 of 4 in range
    expect(ttrRosendaal([r('2026-01-01', 1), r('2026-01-05', 3)])).toBe(75)
  })
})

describe('Naranjo', () => {
  const all = (a: 'yes' | 'no' | 'unknown'): NaranjoAnswers => Array(10).fill(a)

  it('scores like the prototype', () => {
    expect(naranjoScore(all('yes'))).toBe(8)
    expect(naranjoScore(all('no'))).toBe(1)
    expect(naranjoScore(all('unknown'))).toBe(0)
    expect(naranjoScore(Array(10).fill(null))).toBe(0)
  })

  it('spans the range the database CHECK allows (-4 to 13)', () => {
    const best = NARANJO_QUESTIONS.map((q) => (q.yes >= q.no ? 'yes' : 'no'))
    const worst = NARANJO_QUESTIONS.map((q) => (q.yes <= q.no ? 'yes' : 'no'))
    expect(naranjoScore(best)).toBe(13)
    expect(naranjoScore(worst)).toBe(-4)
  })

  it('categorises at the cut-offs', () => {
    expect([13, 9, 8, 5, 4, 1, 0, -4].map(naranjoCategory)).toEqual([
      'definite', 'definite', 'probable', 'probable', 'possible', 'possible', 'doubtful', 'doubtful',
    ])
  })

  it('counts answered questions', () => {
    expect(naranjoAnswered(['yes', 'unknown', null, 'no'])).toBe(3)
  })
})

describe('technique score', () => {
  const pass = (s: AssessedStep): AssessedStep => ({ ...s, result: 'pass' })

  it('matches the prototype: pen, one non-critical step missed', () => {
    const steps = buildStepSnapshot('pen').map(pass)
    steps[5] = { ...steps[5], result: 'fail' }
    expect(scoreTechnique(steps)).toMatchObject({ total: 11, passed: 10, pct: 91, criticalAllPassed: true })
  })

  it('matches the prototype: pen, one critical step missed', () => {
    const steps = buildStepSnapshot('pen').map(pass)
    steps[3] = { ...steps[3], result: 'fail' }
    expect(scoreTechnique(steps)).toMatchObject({ pct: 91, criticalTotal: 4, criticalPassed: 3, criticalAllPassed: false })
  })

  it('treats unassessed steps as not done', () => {
    const s = scoreTechnique(buildStepSnapshot('nasal'))
    expect(s).toMatchObject({ total: 5, assessed: 0, passed: 0, pct: 0, criticalAllPassed: false })
  })
})

describe('checklists', () => {
  it('has a checklist for every device code, matching the prototype step counts', () => {
    const counts = Object.fromEntries(
      Object.entries(CHECKLISTS).map(([k, c]) => [k, `${c.steps.length}/${c.steps.filter((s) => s.critical).length}`]),
    )
    expect(Object.keys(CHECKLISTS).sort()).toEqual(Object.keys(DEVICE).sort())
    expect(counts).toEqual({
      pen: '11/4', syringe: '10/3', mdi: '7/2', spacer: '6/2',
      accuhaler: '7/2', turbuhaler: '7/2', respimat: '6/1', nasal: '5/1',
    })
  })

  it('snapshots are independent copies', () => {
    const a = buildStepSnapshot('mdi')
    a[0].result = 'pass'
    expect(buildStepSnapshot('mdi')[0].result).toBeNull()
  })

  it.each(Object.keys(DEVICE) as Device[])('%s has education topics', (d) => {
    expect(educationTopics(d).length).toBeGreaterThan(0)
  })
})

describe('targets', () => {
  it('uses strict "below goal" for A1c, BP and LDL', () => {
    expect(a1cAtTarget(6.9, DEFAULT_GOALS)).toBe(true)
    expect(a1cAtTarget(7, DEFAULT_GOALS)).toBe(false)
    expect(bpAtTarget(139, 89, DEFAULT_GOALS)).toBe(true)
    expect(bpAtTarget(139, 90, DEFAULT_GOALS)).toBe(false)
    expect(bpAtTarget(128, null, DEFAULT_GOALS)).toBe(true)
    expect(ldlAtTarget(100, DEFAULT_GOALS)).toBe(false)
    expect(a1cAtTarget(7.2, { ...DEFAULT_GOALS, a1c: 7.5 })).toBe(true)
  })

  it('uses an inclusive range for INR', () => {
    expect(inRange(2, 2, 3)).toBe(true)
    expect(inRange(3, 2, 3)).toBe(true)
    expect(inRange(3.01, 2, 3)).toBe(false)
  })
})
