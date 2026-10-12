import Link from 'next/link'
import { HnSearch } from '@/components/hn-search'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { CARE_KINDS, CARE_ORDER } from '@/lib/care-kinds'
import { DRP_ACCEPTANCE, DRP_CATEGORY } from '@/lib/codes'
import { hnError, normalizeHn } from '@/lib/patients/hn'
import { initials } from '@/lib/patients/name'
import { caredToday, openDrpsAll } from '@/lib/patients/queries'
import { bangkokTime } from '@/lib/thai-date'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ hn?: string; invalid?: string }> }) {
  const { hn, invalid } = await searchParams
  const [today, open] = await Promise.all([caredToday(), openDrpsAll(8)])
  const error = invalid ? hnError(normalizeHn(hn)) ?? undefined : undefined

  return (
    <>
      <PageHeader title="ค้นหาผู้ป่วย" />
      <div className="page" style={{ maxWidth: 1120 }}>
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '20px 0 8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--h)' }}>ค้นหาผู้ป่วยด้วย HN</h2>
            <p className="muted">พิมพ์หรือสแกนบาร์โค้ดจากบัตรผู้ป่วย / ใบสั่งยา แล้วกด Enter</p>
          </div>
          <HnSearch defaultValue={hn} error={error} />
          {error && (
            <p id="hn-err" className="err-tx" role="alert">
              {error}
            </p>
          )}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(440px, 100%), 1fr))', gap: 22, alignItems: 'start' }}>
          <section className="card">
            <div className="card-hd">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 className="h2">บริบาลวันนี้</h3>
                <span className="chip">{today.length} ราย</span>
              </div>
            </div>
            {today.length === 0 ? (
              <p className="muted sm" style={{ padding: '18px 22px' }}>
                ยังไม่มีการบันทึกวันนี้
              </p>
            ) : (
              <div>
                {today.map((p) => (
                  <Link key={p.hn} className="row" href={`/patients/${encodeURIComponent(p.hn)}`}>
                    <span className="mono faint sm" style={{ width: 44 }}>
                      {bangkokTime(p.firstAt)}
                    </span>
                    <span className="avatar sm">{initials(p.firstName, p.lastName)}</span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>
                        {p.prefix ?? ''}
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="muted xs">
                        <span className="mono">HN {p.hn}</span>
                        {p.clinicName ? ` · คลินิก${p.clinicName}` : ''}
                      </span>
                    </span>
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {CARE_ORDER.filter((k) => p.kinds.includes(k)).map((k) => (
                        <span key={k} className={`chip ${CARE_KINDS[k].chip}`} style={{ fontSize: 12, padding: '2px 9px' }}>
                          {CARE_KINDS[k].label}
                        </span>
                      ))}
                    </span>
                    <Icon name="chevron" size="sm" className="faint" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-hd">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 className="h2">DRP ที่ยังค้าง</h3>
                <span className={`chip ${open.total ? 'warn' : 'mute'}`}>รอผลลัพธ์ {open.total}</span>
              </div>
            </div>
            {open.rows.length === 0 ? (
              <p className="muted sm" style={{ padding: '18px 22px' }}>
                ไม่มี DRP ค้าง
              </p>
            ) : (
              <div>
                {open.rows.map((d) => (
                  <Link key={d.id} className="row" href={`/patients/${encodeURIComponent(d.hn)}`} style={{ alignItems: 'flex-start' }}>
                    <span className="tag" style={{ marginTop: 3, minWidth: 26, justifyContent: 'center' }}>
                      {d.nccMerp ?? '–'}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600 }}>{DRP_CATEGORY[d.category as keyof typeof DRP_CATEGORY]?.replace(/^\d /, '')}</span>
                      <span className="muted sm">{d.detail}</span>
                      <span className="faint xs">
                        <span className="mono">HN {d.hn}</span> · {d.prefix ?? ''}
                        {d.firstName} {d.lastName} · {DRP_ACCEPTANCE[d.acceptance as keyof typeof DRP_ACCEPTANCE]}
                      </span>
                    </span>
                    <span className={`chip ${d.daysOpen > 30 ? 'bad' : 'mute'}`} style={{ fontSize: 12, padding: '2px 9px' }}>
                      {d.daysOpen === 0 ? 'วันนี้' : `ค้าง ${d.daysOpen} วัน`}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
