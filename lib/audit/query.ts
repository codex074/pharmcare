import { clients } from '@/lib/db'

// The edit history (audit_log, written by triggers) merged with exports
// (export_log), newest first, with server-side filters and paging.

export type AuditAction = 'insert' | 'update' | 'cancel' | 'export'
export const AUDIT_PERIODS = { '7': 7, '30': 30, '90': 90, all: null } as const
export type AuditPeriod = keyof typeof AUDIT_PERIODS

export type AuditFilters = { q?: string; actor?: string; action?: string; period?: string; page?: string }
export type AuditEvent = {
  key: string
  at: Date
  actorId: string
  actorName: string
  action: AuditAction
  tableName: string
  recordId: string | null
  hn: string | null
  diff: Record<string, unknown> | null
  rowCount: number | null
}

export const PAGE_SIZE = 50
const UUID_PREFIX = /^[0-9a-f-]{4,36}$/i
const ACTIONS = ['insert', 'update', 'cancel', 'export']

export function normalizeFilters(f: AuditFilters) {
  const period = (f.period && f.period in AUDIT_PERIODS ? f.period : '7') as AuditPeriod
  return {
    q: (f.q ?? '').replace(/\s+/g, '').slice(0, 40),
    actor: f.actor && /^[0-9a-f-]{36}$/i.test(f.actor) ? f.actor : '',
    action: f.action && ACTIONS.includes(f.action) ? (f.action as AuditAction) : '',
    period,
    page: Math.max(1, Math.min(10_000, Number.parseInt(f.page ?? '1', 10) || 1)),
  }
}

export async function auditEvents(filters: AuditFilters, opts: { all?: boolean } = {}) {
  const f = normalizeFilters(filters)
  const { sql } = clients()
  const days = AUDIT_PERIODS[f.period]
  const where = sql`
    where true
    ${f.actor ? sql`and ev.actor_id = ${f.actor}::uuid` : sql``}
    ${f.action ? sql`and ev.action = ${f.action}` : sql``}
    ${days ? sql`and ev.at >= now() - make_interval(days => ${days})` : sql``}
    ${f.q ? sql`and (p.hn = ${f.q} ${UUID_PREFIX.test(f.q) ? sql`or ev.record_id::text like ${f.q.toLowerCase() + '%'}` : sql``})` : sql``}`
  const events = sql`
    with ev as (
      select 'a' || a.id as key, a.at, a.actor_id, a.actor_name, a.action, a.table_name, a.record_id, a.patient_id, a.diff, null::int as row_count
        from audit_log a
      union all
      select 'e' || e.id, e.at, e.actor_id, e.actor_name, 'export', e.table_name, null, null, e.filters, e.row_count
        from export_log e
    )`

  const [rows, [{ total }]] = await Promise.all([
    sql<
      {
        key: string
        at_ms: number
        actor_id: string
        actor_name: string
        action: AuditAction
        table_name: string
        record_id: string | null
        hn: string | null
        diff: Record<string, unknown> | null
        row_count: number | null
      }[]
    >`
      ${events}
      select ev.key, (extract(epoch from ev.at) * 1000)::float8 as at_ms, ev.actor_id, ev.actor_name, ev.action,
             ev.table_name, ev.record_id, p.hn, ev.diff, ev.row_count
        from ev left join patients p on p.id = ev.patient_id
      ${where}
      order by ev.at desc, ev.key desc
      ${opts.all ? sql`limit 50000` : sql`limit ${PAGE_SIZE} offset ${(f.page - 1) * PAGE_SIZE}`}`,
    sql<{ total: number }[]>`
      ${events}
      select count(*)::int as total from ev left join patients p on p.id = ev.patient_id ${where}`,
  ])

  const events_: AuditEvent[] = rows.map((r) => ({
    key: r.key,
    at: new Date(r.at_ms),
    actorId: r.actor_id,
    actorName: r.actor_name,
    action: r.action,
    tableName: r.table_name,
    recordId: r.record_id,
    hn: r.hn,
    diff: r.diff,
    rowCount: r.row_count,
  }))
  return { filters: f, events: events_, total }
}

// Everyone who has written or exported anything, for the user filter.
export async function auditActors(): Promise<{ id: string; name: string }[]> {
  const { sql } = clients()
  return sql<{ id: string; name: string }[]>`
    select distinct on (actor_id) actor_id as id, actor_name as name from (
      select actor_id, actor_name, at from audit_log
      union all
      select actor_id, actor_name, at from export_log
    ) x order by actor_id, at desc`
}
