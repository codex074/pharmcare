import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { requireUser } from '@/lib/auth/dal'
import { ACTION_TH, describe } from '@/lib/audit/describe'
import { auditActors, auditEvents, PAGE_SIZE, type AuditFilters } from '@/lib/audit/query'
import { clients } from '@/lib/db'
import { EXPORTS, type ExportKey } from '@/lib/export/tables'
import { initials, parseFullName } from '@/lib/patients/name'
import { TABLE_TH } from '@/lib/records/columns'
import { bangkokDate, bangkokTime, thaiDateShort } from '@/lib/thai-date'

export const metadata: Metadata = { title: 'ข้อมูลและประวัติ' }

const ICON: Record<ExportKey, IconName> = {
  patients: 'userPlus',
  visits: 'visit',
  drps: 'drp',
  high_alert_monitoring: 'hal',
  adrs: 'adr',
  technique_assessments: 'tech',
}
const nf = new Intl.NumberFormat('en-US')

async function tableStats(): Promise<Record<ExportKey, { rows: number; lastMs: number | null }>> {
  const { sql } = clients()
  const keys = Object.keys(EXPORTS) as ExportKey[]
  const rows = await Promise.all(
    keys.map(
      (k) => sql<{ rows: number; last_ms: number | null }[]>`
        select count(*)::int as rows,
               (extract(epoch from max(greatest(created_at, updated_at, cancelled_at))) * 1000)::float8 as last_ms
          from ${sql(k)}`,
    ),
  )
  return Object.fromEntries(keys.map((k, i) => [k, { rows: rows[i][0].rows, lastMs: rows[i][0].last_ms }])) as Record<ExportKey, { rows: number; lastMs: number | null }>
}

function when(ms: number | null) {
  if (ms == null) return '—'
  const d = new Date(ms)
  return bangkokDate(d) === bangkokDate() ? bangkokTime(d) : thaiDateShort(bangkokDate(d))
}

function nameInitials(name: string) {
  const n = parseFullName(name)
  return n ? initials(n.firstName, n.lastName) : name.charAt(0)
}

export default async function DataPage({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  await requireUser()
  const sp = await searchParams
  const [stats, actors, audit] = await Promise.all([tableStats(), auditActors(), auditEvents(sp)])
  const f = audit.filters
  const pages = Math.max(1, Math.ceil(audit.total / PAGE_SIZE))
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries({ q: f.q, actor: f.actor, action: f.action, period: f.period, ...extra })) if (v !== '' && v != null) p.set(k, String(v))
    return p.toString()
  }
  const first = audit.total ? (f.page - 1) * PAGE_SIZE + 1 : 0
  const last = Math.min(f.page * PAGE_SIZE, audit.total)

  return (
    <>
      <PageHeader title="ข้อมูลและประวัติ" />
      <div className="page" style={{ maxWidth: 1180, gap: 26 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2 className="h2" style={{ fontSize: 18 }}>
              ส่งออกข้อมูล
            </h2>
            <span className="muted sm">ไฟล์ CSV (UTF-8 BOM) เปิดใน Excel ได้ทันที รวมรายการที่ยกเลิกพร้อมเหตุผล · ทุกการส่งออกถูกบันทึกในประวัติ</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 14 }}>
            {(Object.keys(EXPORTS) as ExportKey[]).map((k) => (
              <div key={k} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span className="care-ic" style={{ width: 38, height: 38 }}>
                    <Icon name={ICON[k]} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 700 }}>{EXPORTS[k].name}</span>
                    <span className="faint xs mono">{k}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 20, color: 'var(--h)' }}>
                      {nf.format(stats[k].rows)}
                    </span>{' '}
                    <span className="muted sm">แถว</span>
                  </span>
                  <span className="faint xs">อัปเดต {when(stats[k].lastMs)}</span>
                </div>
                <a className="btn btn-sm" href={`/api/export/${k}`} download style={{ width: '100%' }}>
                  <Icon name="data" size="sm" />
                  ส่งออก CSV
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-hd" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 className="h2">ประวัติการแก้ไข (Audit log)</h2>
              <span className="muted sm">ใคร เมื่อไร เปลี่ยนอะไร · บันทึกโดยฐานข้อมูล แก้ไขไม่ได้</span>
            </div>
            <a className="btn btn-sm" href={`/api/export/audit_log?${qs({})}`} download>
              <Icon name="data" size="sm" />
              ส่งออก CSV
            </a>
          </div>
          <form method="get" action="/data" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '14px 22px', borderBottom: '1px solid var(--line2)' }}>
            <label style={{ flex: '2 1 240px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 11, padding: '0 12px', minHeight: 42, color: 'var(--tx3)', background: 'var(--card)' }}>
              <Icon name="search" size="sm" />
              <input name="q" defaultValue={f.q} aria-label="ค้นหา HN หรือเลขรายการ" placeholder="ค้นหา HN / เลขรายการ" style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, minWidth: 0, color: 'var(--tx)' }} />
            </label>
            <select name="actor" defaultValue={f.actor} className="input" aria-label="ผู้ใช้" style={{ flex: '1 1 160px', minHeight: 42, width: 'auto' }}>
              <option value="">ผู้ใช้ทั้งหมด</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select name="action" defaultValue={f.action} className="input" aria-label="การกระทำ" style={{ flex: '1 1 140px', minHeight: 42, width: 'auto' }}>
              <option value="">ทุกการกระทำ</option>
              {Object.entries(ACTION_TH).map(([k, a]) => (
                <option key={k} value={k}>
                  {a.label}
                </option>
              ))}
            </select>
            <select name="period" defaultValue={f.period} className="input" aria-label="ช่วงเวลา" style={{ flex: '1 1 140px', minHeight: 42, width: 'auto' }}>
              <option value="7">7 วันล่าสุด</option>
              <option value="30">30 วันล่าสุด</option>
              <option value="90">90 วันล่าสุด</option>
              <option value="all">ทั้งหมด</option>
            </select>
            <button type="submit" className="btn btn-sm" style={{ minHeight: 42 }}>
              กรอง
            </button>
          </form>
          <div className="scroll-x">
            <table className="tbl" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>เมื่อไร</th>
                  <th>ใคร</th>
                  <th>การกระทำ</th>
                  <th>รายการ</th>
                  <th>เปลี่ยนอะไร</th>
                </tr>
              </thead>
              <tbody>
                {audit.events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      ไม่มีรายการในเงื่อนไขนี้
                    </td>
                  </tr>
                )}
                {audit.events.map((e) => {
                  const a = ACTION_TH[e.action]
                  const changes = describe(e.action, e.tableName, e.diff, e.rowCount)
                  return (
                    <tr key={e.key}>
                      <td className="mono sm" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 600 }}>{bangkokTime(e.at)}</span>
                        <br />
                        <span className="faint xs">{thaiDateShort(bangkokDate(e.at))}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="avatar sm">{nameInitials(e.actorName)}</span>
                          <span className="sm" style={{ fontWeight: 600 }}>
                            {e.actorName}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${a.chip}`} style={{ fontSize: 12, padding: '2px 9px' }}>
                          {a.label}
                        </span>
                      </td>
                      <td className="sm">
                        {e.action === 'export' ? (
                          <span className="mono" style={{ fontWeight: 600 }}>
                            {e.tableName}.csv
                          </span>
                        ) : e.hn ? (
                          <Link className="mono" href={`/patients/${encodeURIComponent(e.hn)}?tab=all&cancelled=1`} style={{ fontWeight: 600 }}>
                            HN {e.hn}
                          </Link>
                        ) : (
                          <span className="mono">—</span>
                        )}
                        <br />
                        <span className="faint xs">
                          {TABLE_TH[e.tableName] ?? e.tableName}
                          {e.recordId ? ` · ${e.recordId.slice(0, 8)}` : ''}
                        </span>
                      </td>
                      <td className="sm">
                        {changes.slice(0, 4).map((c, i) => (
                          <div key={i}>
                            {c.field && <span className="muted">{c.field} </span>}
                            {c.from !== undefined && (
                              <>
                                <span style={{ textDecoration: 'line-through', color: 'var(--dan-tx)', margin: '0 6px 0 0' }}>{c.from}</span>
                                <span className="faint">→ </span>
                              </>
                            )}
                            <span style={{ fontWeight: 600 }}>{c.to}</span>
                          </div>
                        ))}
                        {changes.length > 4 && <span className="faint xs">และอีก {changes.length - 4} ช่อง</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', borderTop: '1px solid var(--line2)', gap: 10, flexWrap: 'wrap' }}>
            <span className="muted sm">
              แสดง {nf.format(first)}–{nf.format(last)} จาก {nf.format(audit.total)} รายการ
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {f.page > 1 ? (
                <Link className="btn btn-sm" href={`/data?${qs({ page: f.page - 1 })}`}>
                  ก่อนหน้า
                </Link>
              ) : (
                <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
                  ก่อนหน้า
                </span>
              )}
              {f.page < pages ? (
                <Link className="btn btn-sm" href={`/data?${qs({ page: f.page + 1 })}`}>
                  ถัดไป
                </Link>
              ) : (
                <span className="btn btn-sm" aria-disabled="true" style={{ opacity: 0.5 }}>
                  ถัดไป
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
