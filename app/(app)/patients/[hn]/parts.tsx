import Link from 'next/link'
import { Icon } from '@/components/icons'
import { CARE_KINDS, CARE_ORDER } from '@/lib/care-kinds'
import { CLINIC } from '@/lib/codes'
import type { HisResult } from '@/lib/his'
import { patientHref } from '@/lib/patients/href'

// Pieces shared by the new-case and existing-patient views.

export { patientHref, type PatientParams } from '@/lib/patients/href'

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
export function CareTiles({ hn, clinic, tab, disabled }: { hn: string; clinic?: string; tab?: string; disabled?: boolean }) {
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
          <Link key={k} className="care" href={patientHref(hn, { form: k, clinic, tab })} style={{ textDecoration: 'none' }} scroll={false}>
            {body}
          </Link>
        )
      })}
    </div>
  )
}
