import { Icon } from '@/components/icons'
import { DEVICE, DRP_ACCEPTANCE, DRP_CATEGORY } from '@/lib/codes'
import type { Metric, Overview, Patient } from '@/lib/patients/queries'
import { thaiDateShort } from '@/lib/thai-date'
import { TrendChart } from './trend-chart'

type Lab = { name: string; unit: string; target: string; metric: Metric | null; okText?: string; extra?: string }

export function OverviewTab({ patient: p, o }: { patient: Patient; o: Overview }) {
  const labs: Lab[] = [
    { name: 'HbA1c', unit: '%', target: `< ${p.goalA1c}`, metric: o.a1c },
    { name: 'BP', unit: 'mmHg', target: `< ${p.goalSbp}/${p.goalDbp}`, metric: o.bp },
    { name: 'LDL', unit: 'mg/dL', target: `< ${p.goalLdl}`, metric: o.ldl },
    { name: 'eGFR', unit: 'mL/min', target: 'CKD-EPI 2021', metric: o.egfr },
  ]
  if (o.inr) {
    labs.push({
      name: 'INR',
      unit: '',
      target: `${o.inr.low}–${o.inr.high}`,
      metric: o.inr,
      okText: 'ในช่วงเป้า',
      extra: o.inr.ttr == null ? 'TTR: ต้องมีผลอย่างน้อย 2 ครั้ง' : `TTR ${o.inr.ttr}%`,
    })
  }
  const latest = labs.map((l) => l.metric?.date).filter(Boolean).sort().at(-1)
  const a1c = o.a1cSeries.slice(-6)
  const first = o.a1cSeries[0]
  const last = o.a1cSeries.at(-1)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
      <div style={{ flex: '2 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <section className="card">
          <div className="card-hd">
            <h3 className="h2">ค่าล่าสุดเทียบเป้าหมาย</h3>
            {latest && <span className="muted sm">ล่าสุด {thaiDateShort(latest)}</span>}
          </div>
          <div className="card-bd" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 12 }}>
            {labs.map((l) => (
              <div key={l.name} style={{ border: '1px solid var(--line)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="muted sm" style={{ fontWeight: 600 }}>
                  {l.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--h)' }}>
                    {l.metric?.value ?? '–'}
                  </span>
                  <span className="faint xs">{l.unit}</span>
                </span>
                <span className="faint xs">
                  {l.name === 'eGFR' ? l.target : `เป้า ${l.target}`}
                  {l.metric ? ` · ${thaiDateShort(l.metric.date)}` : ''}
                </span>
                {l.extra && <span className="muted xs">{l.extra}</span>}
                {!l.metric ? (
                  <span className="chip mute" style={{ alignSelf: 'flex-start', fontSize: 12, padding: '2px 9px' }}>
                    ยังไม่มีผล
                  </span>
                ) : l.metric.ok == null ? null : (
                  <span className={`chip ${l.metric.ok ? 'ok' : 'bad'}`} style={{ alignSelf: 'flex-start', fontSize: 12, padding: '2px 9px' }}>
                    <Icon name={l.metric.ok ? 'check' : 'alert'} size="sm" />
                    {l.metric.ok ? l.okText ?? 'ถึงเป้า' : l.okText ? 'นอกช่วงเป้า' : 'ไม่ถึงเป้า'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {a1c.length > 0 && (
          <section className="card">
            <div className="card-hd" style={{ flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="h2">แนวโน้ม HbA1c</h3>
                {first && last && o.a1cSeries.length > 1 && (
                  <span className="muted sm">
                    {last.value <= first.value ? 'ลดลง' : 'เพิ่มขึ้น'} {Math.abs(Math.round((last.value - first.value) * 10) / 10)}% จากครั้งแรก
                  </span>
                )}
              </div>
              <span className="sm muted" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 10, borderRadius: 3, background: 'var(--ok-bg)', border: '1px dashed var(--ok)' }} />
                ช่วงเป้าหมาย &lt; {p.goalA1c}%
              </span>
            </div>
            <div className="card-bd">
              <TrendChart points={a1c} goal={p.goalA1c} unit="%" label="กราฟ HbA1c" />
            </div>
          </section>
        )}
      </div>

      <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <section className="card">
          <div className="card-hd">
            <h3 className="h2">DRP ที่ยังค้าง</h3>
            <span className={`chip ${o.openDrps.length ? 'warn' : 'mute'}`}>{o.openDrps.length} รายการ</span>
          </div>
          {o.openDrps.length === 0 ? (
            <p className="muted sm" style={{ padding: '14px 22px' }}>
              ไม่มี DRP ค้าง
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {o.openDrps.map((d) => (
                <div key={d.id} className="row" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 6, padding: '14px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {d.nccMerp && <span className="tag">{d.nccMerp}</span>}
                    <span style={{ fontWeight: 600 }}>{DRP_CATEGORY[d.category as keyof typeof DRP_CATEGORY]?.replace(/^\d /, '')}</span>
                  </div>
                  <span className="muted sm">{[d.drug, d.detail].filter(Boolean).join(' · ')}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="chip mute" style={{ fontSize: 12, padding: '2px 9px' }}>
                      {DRP_ACCEPTANCE[d.acceptance as keyof typeof DRP_ACCEPTANCE]}
                    </span>
                    <span className="chip warn" style={{ fontSize: 12, padding: '2px 9px' }}>
                      รอผลลัพธ์ · {d.daysOpen === 0 ? 'วันนี้' : `ค้าง ${d.daysOpen} วัน`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {o.technique && (
          <section className="card">
            <div className="card-hd">
              <h3 className="h2">เทคนิคการใช้ยาล่าสุด</h3>
            </div>
            <div className="card-bd" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 600 }}>{DEVICE[o.technique.device as keyof typeof DEVICE]}</span>
                <span className="mono" style={{ fontWeight: 700, color: 'var(--h)' }}>
                  {o.technique.pct}%
                </span>
              </div>
              <div className="bar" role="progressbar" aria-valuenow={o.technique.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`ทำถูก ${o.technique.pct}%`}>
                <div style={{ width: `${o.technique.pct}%` }} />
              </div>
              <span className="muted sm">
                ทำถูก {o.technique.passed}/{o.technique.total} ขั้น · {thaiDateShort(o.technique.date)}
                {o.technique.previousPct != null && o.technique.previousDate && ` · ครั้งก่อน ${o.technique.previousPct}% (${thaiDateShort(o.technique.previousDate)})`}
                {o.technique.missedCritical.length > 0 && ` · ต้องทวน: ${o.technique.missedCritical.join(', ')}`}
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
