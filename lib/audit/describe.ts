import type { CareKind } from '@/lib/patients/queries'
import { formatTimeline } from '@/lib/patients/timeline-format'
import { codeLabel, COLUMN_TH, TABLE_TH } from '@/lib/records/columns'
import type { AuditAction } from './query'

// Human-readable "what changed" for one audit event.

export const ACTION_TH: Record<AuditAction, { label: string; chip: string }> = {
  insert: { label: 'สร้าง', chip: 'ok' },
  update: { label: 'แก้ไข', chip: 'info' },
  cancel: { label: 'ยกเลิก', chip: 'bad' },
  export: { label: 'ส่งออก', chip: 'mute' },
}

const KIND: Record<string, CareKind> = { visits: 'visit', drps: 'drp', high_alert_monitoring: 'hal', adrs: 'adr', technique_assessments: 'tech' }
// Bookkeeping columns that change with every edit and say nothing to a reader.
const NOISE = new Set(['cancelled_at', 'cancelled_by', 'his_synced_at'])

export type Change = { field: string; from?: string; to: string }

export function show(v: unknown): string {
  if (v == null || v === '') return '—'
  if (v === true) return 'ใช่'
  if (v === false) return 'ไม่'
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ') : '—'
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  return s.length > 80 ? `${s.slice(0, 80)}…` : s
}

export function describe(action: AuditAction, table: string, diff: Record<string, unknown> | null, rowCount: number | null): Change[] {
  if (action === 'export') {
    return [{ field: `ส่งออก ${TABLE_TH[table] ?? table} ·`, to: `${rowCount ?? 0} แถว` }]
  }
  if (!diff) return []
  if (action === 'insert') {
    if (table === 'patients') return [{ field: 'ลงทะเบียน ·', to: `${diff.prefix ?? ''}${diff.first_name} ${diff.last_name}` }]
    const kind = KIND[table]
    return [{ field: '', to: kind ? formatTimeline(kind, diff).title : table }]
  }
  const changes = diff as Record<string, { from: unknown; to: unknown }>
  if (action === 'cancel') return [{ field: 'เหตุผล', to: show(changes.cancel_reason?.to) }]
  return Object.entries(changes)
    .filter(([col]) => !NOISE.has(col))
    .map(([col, c]) => ({
      field: COLUMN_TH[col] ?? col,
      from: show(codeLabel(table, col, c.from)),
      to: show(codeLabel(table, col, c.to)),
    }))
}
