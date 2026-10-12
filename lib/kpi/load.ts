import { and, eq, isNull } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { clients } from '@/lib/db'
import { adrs, drps, highAlertMonitoring, patients, techniqueAssessments, visits } from '@/lib/db/schema'
import { bangkokDate } from '@/lib/thai-date'
import { computeKpis, PERIODS, type Period } from './compute'

// Loads the non-cancelled rows of non-cancelled patients and computes the KPIs.
// Volumes are small (thousands of rows per year), so the maths runs in JS where
// it shares lib/calc with the patient screens.
export async function loadKpis(period: Period) {
  const { db } = clients()
  const today = bangkokDate()
  const days = PERIODS[period]
  const from = days ? shiftDays(today, -(days - 1)) : null
  // Live record of a live patient.
  const live = (t: { cancelledAt: AnyPgColumn }) => and(isNull(t.cancelledAt), isNull(patients.cancelledAt))

  const [pts, vs, ds, hs, as, ts] = await Promise.all([
    db
      .select({ id: patients.id, a1c: patients.goalA1c, sbp: patients.goalSbp, dbp: patients.goalDbp, ldl: patients.goalLdl })
      .from(patients)
      .where(isNull(patients.cancelledAt)),
    db
      .select({ patientId: visits.patientId, date: visits.date, sbp: visits.sbp, dbp: visits.dbp, a1c: visits.a1c, ldl: visits.ldl })
      .from(visits)
      .innerJoin(patients, eq(patients.id, visits.patientId))
      .where(live(visits)),
    db
      .select({ patientId: drps.patientId, date: drps.date, category: drps.category, acceptance: drps.acceptance, outcome: drps.outcome })
      .from(drps)
      .innerJoin(patients, eq(patients.id, drps.patientId))
      .where(live(drps)),
    db
      .select({
        patientId: highAlertMonitoring.patientId,
        date: highAlertMonitoring.date,
        parameter: highAlertMonitoring.parameter,
        value: highAlertMonitoring.value,
        low: highAlertMonitoring.targetLow,
        high: highAlertMonitoring.targetHigh,
      })
      .from(highAlertMonitoring)
      .innerJoin(patients, eq(patients.id, highAlertMonitoring.patientId))
      .where(live(highAlertMonitoring)),
    db.select({ patientId: adrs.patientId, date: adrs.date }).from(adrs).innerJoin(patients, eq(patients.id, adrs.patientId)).where(live(adrs)),
    db
      .select({
        patientId: techniqueAssessments.patientId,
        date: techniqueAssessments.date,
        device: techniqueAssessments.device,
        scorePct: techniqueAssessments.scorePct,
        criticalAllPassed: techniqueAssessments.criticalAllPassed,
        createdAt: techniqueAssessments.createdAt,
      })
      .from(techniqueAssessments)
      .innerJoin(patients, eq(patients.id, techniqueAssessments.patientId))
      .where(live(techniqueAssessments)),
  ])

  const kpis = computeKpis({
    from,
    visits: vs,
    drps: ds,
    hal: hs,
    adrs: as,
    techs: ts.map((t) => ({ ...t, createdAt: t.createdAt.getTime() })),
    goals: new Map(pts.map((p) => [p.id, { a1c: p.a1c, sbp: p.sbp, dbp: p.dbp, ldl: p.ldl }])),
  })
  return { kpis, from, to: today, registered: pts.length }
}

function shiftDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
