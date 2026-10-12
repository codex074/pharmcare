import Link from 'next/link'
import { Icon } from '@/components/icons'
import { CARE_KINDS } from '@/lib/care-kinds'
import { initials, parseFullName } from '@/lib/patients/name'
import type { CareKind, TimelineRow } from '@/lib/patients/queries'
import { formatTimeline } from '@/lib/patients/timeline-format'
import { bangkokDate, bangkokTime, thaiDateShort } from '@/lib/thai-date'

function nameInitials(name: string) {
  const n = parseFullName(name)
  return n ? initials(n.firstName, n.lastName) : name.charAt(0)
}

export function TimelineTab({
  rows,
  kind,
  showCancelled,
  toggleHref,
}: {
  rows: TimelineRow[]
  kind: CareKind | 'all'
  showCancelled: boolean
  toggleHref: string
}) {
  const ofKind = rows.filter((r) => kind === 'all' || r.kind === kind)
  const shown = ofKind.filter((r) => showCancelled || !r.cancelledAt)
  const cancelledCount = ofKind.length - ofKind.filter((r) => !r.cancelledAt).length
  const title = kind === 'all' ? 'ประวัติทั้งหมด' : CARE_KINDS[kind].title

  return (
    <section className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="h2">{title}</h3>
          <span className="muted sm">เรียงจากใหม่ไปเก่า · {shown.length} รายการ</span>
        </div>
        {cancelledCount > 0 && (
          <Link className="sm muted" href={toggleHref} scroll={false} role="switch" aria-checked={showCancelled} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <input type="checkbox" checked={showCancelled} readOnly tabIndex={-1} aria-hidden="true" style={{ width: 18, height: 18, accentColor: 'var(--pri)' }} />
            แสดงรายการที่ยกเลิก ({cancelledCount})
          </Link>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="muted">ยังไม่มีรายการ</p>
      ) : (
        <ol className="tl" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {shown.map((r) => {
            const meta = CARE_KINDS[r.kind]
            const t = formatTimeline(r.kind, r.data)
            const cancelled = !!r.cancelledAt
            return (
              <li key={r.id} className={`tl-item${cancelled ? ' void' : ''}`}>
                <span className="tl-ic" style={meta.tone}>
                  <Icon name={meta.icon} />
                </span>
                <div style={{ border: '1px solid var(--line)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--card)', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`chip ${meta.chip}`} style={{ fontSize: 12, padding: '2px 9px' }}>
                      {meta.label}
                    </span>
                    {cancelled && (
                      <span className="chip mute" style={{ fontSize: 12, padding: '2px 9px' }}>
                        ยกเลิกแล้ว
                      </span>
                    )}
                    <span className="faint sm mono">
                      {thaiDateShort(r.date)}
                      {bangkokDate(r.createdAt) === r.date ? ` · ${bangkokTime(r.createdAt)}` : ''}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span className="muted xs" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="avatar sm" style={{ width: 22, height: 22, fontSize: 10 }}>
                        {nameInitials(r.createdByName)}
                      </span>
                      {r.createdByName}
                    </span>
                  </div>
                  <span className="strike" style={{ fontWeight: 600 }}>
                    {t.title}
                  </span>
                  {t.detail && <span className="strike muted sm">{t.detail}</span>}
                  {!cancelled && t.status.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.status.map((s) => (
                        <span key={s.label} className={`chip ${s.tone}`} style={{ fontSize: 12, padding: '2px 9px' }}>
                          {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {cancelled && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--line2)', fontSize: 13, color: 'var(--tx2)' }}>
                      <Icon name="info" size="sm" />
                      <span>
                        ยกเลิกโดย {r.cancelledByName ?? 'ไม่ทราบ'} · {thaiDateShort(bangkokDate(r.cancelledAt!))} {bangkokTime(r.cancelledAt!)} — เหตุผล: {r.cancelReason}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
