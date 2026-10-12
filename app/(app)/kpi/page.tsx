import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { requireUser } from '@/lib/auth/dal'
import { DRP_CATEGORY } from '@/lib/codes'
import { PERIODS, type Period, type Ratio } from '@/lib/kpi/compute'
import { loadKpis } from '@/lib/kpi/load'
import { thaiDateShort } from '@/lib/thai-date'

export const metadata: Metadata = { title: 'ตัวชี้วัด' }

const PERIOD_LABEL: Record<Period, string> = { '30': '30 วัน', '90': '90 วัน', '365': '1 ปี', all: 'ทั้งหมด' }
const nf = new Intl.NumberFormat('en-US')
const pct = (r: Ratio) => (r.pct == null ? '–' : `${r.pct}%`)
const of = (r: Ratio, unit: string) => (r.d ? `${nf.format(r.n)} จาก ${nf.format(r.d)} ${unit}` : `ยังไม่มี${unit}`)

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card kpi">
      <span className="kpi-l">{label}</span>
      <span className="kpi-v">{value}</span>
      <span className="faint xs">{note}</span>
    </div>
  )
}

export default async function KpiPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireUser()
  const raw = (await searchParams).period
  const period: Period = raw && raw in PERIODS ? (raw as Period) : '90'
  const { kpis: k, from, to } = await loadKpis(period)
  const range = from ? `${thaiDateShort(from)} – ${thaiDateShort(to)}` : 'ตั้งแต่เริ่มใช้ระบบ'
  const maxCat = Math.max(1, ...k.byCategory.map((c) => c.n))
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(170px, 100%), 1fr))', gap: 14 } as const

  return (
    <>
      <PageHeader title="ตัวชี้วัด" />
      <div className="page" style={{ maxWidth: 1180 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 className="h2" style={{ fontSize: 18 }}>
              ภาพรวมงานบริบาล
            </h2>
            <span className="muted sm">{range}</span>
          </div>
          <nav className="seg" aria-label="ช่วงเวลา">
            {(Object.keys(PERIODS) as Period[]).map((p) => (
              <Link
                key={p}
                href={p === '90' ? '/kpi' : `/kpi?period=${p}`}
                className={period === p ? 'on' : ''}
                aria-current={period === p ? 'true' : undefined}
                style={{ minHeight: 36, padding: '0 14px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', fontWeight: 600, textDecoration: 'none' }}
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </nav>
        </div>

        <div style={grid}>
          <Tile label="ผู้ป่วย" value={nf.format(k.patients)} note="ราย (ไม่ซ้ำ) ที่ได้รับการบริบาล" />
          <Tile label="Visit" value={nf.format(k.visits)} note="ครั้งที่ติดตามโรคเรื้อรัง" />
          <Tile label="DRP ต่อ Visit" value={k.drpPerVisit == null ? '–' : k.drpPerVisit.toFixed(2)} note={`DRP ${nf.format(k.drps)} รายการ ÷ Visit`} />
          <Tile label="% แพทย์ยอมรับ" value={pct(k.acceptance)} note={of(k.acceptance, 'ครั้งที่ปรึกษาแพทย์')} />
          <Tile label="% DRP แก้ไขได้" value={pct(k.resolved)} note={of(k.resolved, 'DRP ที่ติดตามผลแล้ว')} />
          <Tile label="TTR เฉลี่ย" value={k.ttrMean == null ? '–' : `${k.ttrMean}%`} note={`ผู้ป่วยวาร์ฟาริน ${k.ttrPatients} ราย (Rosendaal, ทุกช่วงเวลา)`} />
        </div>

        <section className="card">
          <div className="card-hd" style={{ flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="h2">DRP ตามประเภท</h3>
              <span className="muted sm">รวม {nf.format(k.drps)} รายการ</span>
            </div>
            <a className="btn btn-sm" href="/api/export/drps" download>
              <Icon name="data" size="sm" />
              ส่งออก CSV
            </a>
          </div>
          <div className="card-bd" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {k.byCategory.map((c) => (
              <div key={c.code} className="kpi-bar">
                <span className="sm" style={{ fontWeight: 500 }}>
                  {DRP_CATEGORY[c.code as keyof typeof DRP_CATEGORY].replace(/^\d /, '')}
                </span>
                <div style={{ height: 22, background: 'var(--line2)', borderRadius: 7, overflow: 'hidden' }} aria-hidden="true">
                  <div style={{ height: '100%', width: `${(c.n / maxCat) * 100}%`, background: c.n === maxCat && c.n > 0 ? 'var(--pri)' : 'var(--pri-100)', borderRadius: 7 }} />
                </div>
                <span className="sm mono" style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: 'var(--h)' }}>{c.n}</span>{' '}
                  <span className="faint">· {k.drps ? Math.round((c.n / k.drps) * 100) : 0}%</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="h2">ผลลัพธ์ทางคลินิก</h3>
            <span className="muted sm">ค่าล่าสุดของผู้ป่วยแต่ละราย เทียบเป้าหมายรายบุคคล (ไม่ขึ้นกับช่วงเวลา)</span>
          </div>
          <div style={grid}>
            <Tile label="HbA1c ถึงเป้า" value={pct(k.a1cAtTarget)} note={of(k.a1cAtTarget, 'รายที่มีผล')} />
            <Tile label="BP ถึงเป้า" value={pct(k.bpAtTarget)} note={of(k.bpAtTarget, 'รายที่มีผล')} />
            <Tile label="LDL ถึงเป้า" value={pct(k.ldlAtTarget)} note={of(k.ldlAtTarget, 'รายที่มีผล')} />
            <Tile label="ADR / แพ้ยา" value={nf.format(k.adrs)} note="รายการในช่วงเวลานี้" />
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 className="h2">ยาความเสี่ยงสูงและเทคนิคการใช้ยา</h3>
          <div style={grid}>
            <Tile label="ผล INR อยู่ในเป้า" value={pct(k.inrInRange)} note={of(k.inrInRange, 'ครั้ง')} />
            <Tile label="ครั้งที่ประเมินเทคนิค" value={nf.format(k.techniques)} note="ในช่วงเวลานี้" />
            <Tile
              label="คะแนนเทคนิค แรก → ล่าสุด"
              value={k.techniqueFirst == null ? '–' : `${k.techniqueFirst}% → ${k.techniqueLast}%`}
              note={`${k.techniquePairs} คู่ผู้ป่วย-อุปกรณ์ที่ประเมินซ้ำ`}
            />
            <Tile label="ขั้นสำคัญครบ (ครั้งล่าสุด)" value={pct(k.criticalAllPassed)} note={of(k.criticalAllPassed, 'คู่ผู้ป่วย-อุปกรณ์')} />
          </div>
        </section>
      </div>
    </>
  )
}
