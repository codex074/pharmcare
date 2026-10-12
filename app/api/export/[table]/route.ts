import { sql } from 'drizzle-orm'
import { requireUser } from '@/lib/auth/dal'
import { ACTION_TH, describe } from '@/lib/audit/describe'
import { auditEvents, type AuditFilters } from '@/lib/audit/query'
import { withActor } from '@/lib/db'
import { toCsv } from '@/lib/export/csv'
import { exportRows, isExportKey } from '@/lib/export/tables'
import { TABLE_TH } from '@/lib/records/columns'
import { bangkokDate } from '@/lib/thai-date'

export const dynamic = 'force-dynamic'

// GET /api/export/<table>.csv-ish download. Every export is logged in the
// database (log_export) with the user, table and row count.
export async function GET(request: Request, { params }: { params: Promise<{ table: string }> }) {
  const user = await requireUser()
  const { table } = await params
  const search = Object.fromEntries(new URL(request.url).searchParams) as AuditFilters

  let csv: string
  let rowCount: number
  let filters: Record<string, string> = {}
  if (isExportKey(table)) {
    const { headers, rows } = await exportRows(table)
    csv = toCsv(headers, rows)
    rowCount = rows.length
  } else if (table === 'audit_log') {
    const { events, filters: f } = await auditEvents(search, { all: true })
    filters = Object.fromEntries(Object.entries({ q: f.q, actor: f.actor, action: f.action, period: f.period }).filter(([, v]) => v))
    csv = toCsv(
      ['at', 'actor', 'action', 'table', 'hn', 'record_id', 'changes'],
      events.map((e) => [
        e.at,
        e.actorName,
        ACTION_TH[e.action].label,
        TABLE_TH[e.tableName] ?? e.tableName,
        e.hn,
        e.recordId,
        describe(e.action, e.tableName, e.diff, e.rowCount)
          .map((c) => `${c.field}${c.from !== undefined ? ` ${c.from} → ` : ' '}${c.to}`.trim())
          .join(' | '),
      ]),
    )
    rowCount = events.length
  } else {
    return new Response('not found', { status: 404 })
  }

  await withActor(user, (tx) => tx.execute(sql`select log_export(${table}, ${rowCount}, ${JSON.stringify(filters)}::jsonb)`))

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pharmcare-${table}-${bangkokDate()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
