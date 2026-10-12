import { and, desc, eq, isNull, ne } from 'drizzle-orm'
import { scoreTechnique, type AssessedStep } from '@/lib/calc/technique'
import { clients } from '@/lib/db'
import { techniqueAssessments, visits } from '@/lib/db/schema'
import { thaiDateShort } from '@/lib/thai-date'
import type { MedRecRow } from './form-values'
import type { RecordKind } from './schemas'
import { TABLES } from './tables'

// Server-side loads for the form panels.

export async function loadRecord(kind: RecordKind, id: string, patientId: string): Promise<Record<string, unknown> | null> {
  const { db } = clients()
  const t = TABLES[kind] as typeof TABLES.visit
  const where = kind === 'patient' ? eq(t.id, id) : and(eq(t.id, id), eq(t.patientId, patientId))
  const [row] = await db.select().from(t).where(where).limit(1)
  return (row as Record<string, unknown>) ?? null
}

// The drug list of the latest non-cancelled visit, to start a new one from.
export async function lastMedRec(patientId: string): Promise<MedRecRow[]> {
  const { db } = clients()
  const [row] = await db
    .select({ medRec: visits.medRec })
    .from(visits)
    .where(and(eq(visits.patientId, patientId), isNull(visits.cancelledAt)))
    .orderBy(desc(visits.date), desc(visits.createdAt))
    .limit(1)
  return (row?.medRec as MedRecRow[] | undefined) ?? []
}

// "64% (13 ก.ค. 2569)" per device, from the latest other assessment.
export async function previousTechnique(patientId: string, excludeId?: string): Promise<Record<string, string>> {
  const { db } = clients()
  const rows = await db
    .select({ device: techniqueAssessments.device, date: techniqueAssessments.date, steps: techniqueAssessments.steps })
    .from(techniqueAssessments)
    .where(
      and(
        eq(techniqueAssessments.patientId, patientId),
        isNull(techniqueAssessments.cancelledAt),
        excludeId ? ne(techniqueAssessments.id, excludeId) : undefined,
      ),
    )
    .orderBy(desc(techniqueAssessments.date), desc(techniqueAssessments.createdAt))
    .limit(50)
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (out[r.device]) continue
    out[r.device] = `${scoreTechnique(r.steps as AssessedStep[]).pct}% (${thaiDateShort(r.date)})`
  }
  return out
}
