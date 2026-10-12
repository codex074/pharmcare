// Technique score from an assessed checklist snapshot (see lib/checklists.ts).
// A step that was not assessed (result null) counts as not done, as in the prototype.

export type StepResult = 'pass' | 'fail' | null
export type AssessedStep = { text: string; critical: boolean; result: StepResult }

export type TechniqueScore = {
  total: number
  assessed: number
  passed: number
  pct: number
  criticalTotal: number
  criticalPassed: number
  criticalAllPassed: boolean
}

export function scoreTechnique(steps: readonly AssessedStep[]): TechniqueScore {
  const total = steps.length
  const passed = steps.filter((s) => s.result === 'pass').length
  const critical = steps.filter((s) => s.critical)
  const criticalPassed = critical.filter((s) => s.result === 'pass').length
  return {
    total,
    assessed: steps.filter((s) => s.result != null).length,
    passed,
    pct: total ? Math.round((passed / total) * 100) : 0,
    criticalTotal: critical.length,
    criticalPassed,
    criticalAllPassed: criticalPassed === critical.length,
  }
}
