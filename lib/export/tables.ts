import { asc, eq, getTableColumns } from 'drizzle-orm'
import * as C from '@/lib/codes'
import { clients } from '@/lib/db'
import { adrs, drps, highAlertMonitoring, patients, techniqueAssessments, visits } from '@/lib/db/schema'
import { CODE_LABELS, codeLabel } from '@/lib/records/columns'

// Every row is exported, cancelled ones included (cancel columns say why).
// Coded columns get a Thai "<column>_th" companion for Excel readers.

export const EXPORTS = {
  patients: { name: 'ผู้ป่วย', table: patients },
  visits: { name: 'Visit ติดตามโรคเรื้อรัง', table: visits },
  drps: { name: 'ปัญหาจากการใช้ยา (DRP)', table: drps },
  high_alert_monitoring: { name: 'ยาความเสี่ยงสูง', table: highAlertMonitoring },
  adrs: { name: 'ADR / แพ้ยา', table: adrs },
  technique_assessments: { name: 'สอนเทคนิคการใช้ยา', table: techniqueAssessments },
} as const

export type ExportKey = keyof typeof EXPORTS
export const isExportKey = (v: string): v is ExportKey => v in EXPORTS


// Readable forms of the JSON columns.
function readable(col: string, v: unknown): unknown {
  if (col === 'med_rec' && Array.isArray(v))
    return v.map((r: { drug: string; ordered: string; actual: string; status: string }) => `${r.drug} | สั่ง ${r.ordered} | ใช้จริง ${r.actual} | ${C.MED_REC_STATUS[r.status as keyof typeof C.MED_REC_STATUS] ?? r.status}`)
  if (col === 'steps' && Array.isArray(v))
    return v.map((s: { text: string; critical: boolean; result: string | null }, i: number) => `${i + 1}. [${s.result === 'pass' ? 'ถูก' : s.result === 'fail' ? 'ไม่ถูก' : '-'}]${s.critical ? ' (สำคัญ)' : ''} ${s.text}`)
  if (col === 'naranjo_answers' && Array.isArray(v)) return v.map((a, i) => `${i + 1}:${a ? C.NARANJO_ANSWER[a as keyof typeof C.NARANJO_ANSWER] : '-'}`)
  return v
}

export async function exportRows(key: ExportKey): Promise<{ headers: string[]; rows: unknown[][] }> {
  const { db } = clients()
  const { table } = EXPORTS[key]
  const cols = Object.entries(getTableColumns(table)) as [string, { name: string }][]
  const labels = CODE_LABELS[key] ?? {}
  const headers: string[] = key === 'patients' ? [] : ['hn']
  for (const [, c] of cols) {
    headers.push(c.name)
    if (labels[c.name]) headers.push(`${c.name}_th`)
  }

  const data =
    key === 'patients'
      ? (await db.select({ row: patients }).from(patients).orderBy(asc(patients.createdAt))).map((r) => ({ hn: null, row: r.row as Record<string, unknown> }))
      : (
          await db
            .select({ hn: patients.hn, row: table as typeof visits })
            .from(table as typeof visits)
            .innerJoin(patients, eq(patients.id, (table as typeof visits).patientId))
            .orderBy(asc((table as typeof visits).date), asc((table as typeof visits).createdAt))
        ).map((r) => ({ hn: r.hn, row: r.row as Record<string, unknown> }))

  const rows = data.map(({ hn, row }) => {
    const out: unknown[] = key === 'patients' ? [] : [hn]
    for (const [prop, c] of cols) {
      out.push(readable(c.name, row[prop]))
      if (labels[c.name]) out.push(codeLabel(key, c.name, row[prop]))
    }
    return out
  })
  return { headers, rows }
}
