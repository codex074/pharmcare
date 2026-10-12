import Link from 'next/link'
import { Icon } from '@/components/icons'
import { CARE_KINDS, CARE_ORDER } from '@/lib/care-kinds'
import { CLINIC } from '@/lib/codes'
import type { HisResult } from '@/lib/his'
import type { CareKind } from '@/lib/patients/queries'

// Pieces shared by the new-case and existing-patient views.

export type PatientParams = { tab?: string; clinic?: string; form?: string; cancelled?: string }

export function patientHref(hn: string, p: PatientParams): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v)
  const s = q.toString()
  return `/patients/${encodeURIComponent(hn)}${s ? `?${s}` : ''}`
}

export const clinicName = (code: string | undefined) => (code && code in CLINIC ? CLINIC[code as keyof typeof CLINIC] : null)

// Yellow band for every HIS result except `found`.
export function HisBand({ his, existing, retryHref }: { his: HisResult; existing: boolean; retryHref: string }) {
  if (his.status === 'found') {
    return existing ? null : (
      <div className="band info" role="status">
        <Icon name="check" />
        <span>ดึงข้อมูลจาก HIS สำเร็จ — ตรวจสอบแล้วกดลงทะเบียน</span>
      </div>
    )
  }
  const notFound = his.status === 'not_found'
  return (
    <div className="band warn" role="status" style={{ flexWrap: 'wrap' }}>
      <Icon name="warn" />
      <span style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column' }}>
        <span>{notFound ? 'ไม่พบ visit วันนี้ใน HIS' : 'ดึงข้อมูลจาก HIS ไม่ได้'}</span>
        <span className="sm" style={{ fontWeight: 500 }}>
          {existing ? 'ใช้ชื่อที่บันทึกไว้ และเลือกคลินิกวันนี้เอง' : 'กรอกชื่อ-สกุลและเลือกคลินิกเองได้'}
        </span>
      </span>
      {his.status !== 'not_configured' && (
        <Link className="btn btn-sm" href={retryHref} style={{ borderColor: 'var(--warn-bd)', background: 'var(--card)', color: 'var(--warn-tx)' }}>
          <Icon name="refresh" size="sm" />
          ลองอีกครั้ง
        </Link>
      )}
    </div>
  )
}

// The five care-type tiles. Each opens its form in the side panel (?form=…).
export function CareTiles({ hn, clinic, disabled }: { hn: string; clinic?: string; disabled?: boolean }) {
  return (
    <div className="care-grid">
      {CARE_ORDER.map((k) => {
        const c = CARE_KINDS[k]
        const body = (
          <>
            <span className="care-ic" style={c.tone}>
              <Icon name={c.icon} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="care-t">{c.tile}</span>
              <span className="care-s">{c.tileSub}</span>
            </span>
          </>
        )
        return disabled ? (
          <span key={k} className="care off" aria-disabled="true">
            {body}
          </span>
        ) : (
          <Link key={k} className="care" href={patientHref(hn, { form: k, clinic })} style={{ textDecoration: 'none' }} scroll={false}>
            {body}
          </Link>
        )
      })}
    </div>
  )
}

// Until step 6 the forms are a placeholder in the right-hand panel.
export function FormSheet({ kind, closeHref, clinic }: { kind: CareKind; closeHref: string; clinic: string | null }) {
  const c = CARE_KINDS[kind]
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={c.title}>
      <Link className="scrim" href={closeHref} aria-label="ปิด" scroll={false} />
      <div className="sheet-body" style={{ background: 'var(--card)' }}>
        <div className="panel-hd">
          <span className="care-ic" style={c.tone}>
            <Icon name={c.icon} />
          </span>
          <h2 className="h2" style={{ flex: 1 }}>
            {c.title}
          </h2>
          <Link className="btn btn-ic" href={closeHref} aria-label="ปิด" scroll={false}>
            <Icon name="close" />
          </Link>
        </div>
        <div className="sec">
          <p className="muted">ฟอร์มนี้จะเพิ่มในขั้นที่ 6</p>
          {clinic && <p className="sm">คลินิกวันนี้: {clinic}</p>}
        </div>
      </div>
    </div>
  )
}
