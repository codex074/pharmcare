import Link from 'next/link'
import { Icon } from '@/components/icons'
import type { CurrentUser } from '@/lib/auth/dal'
import { CARE_KINDS, isCareKind } from '@/lib/care-kinds'
import { fullName } from '@/lib/patients/name'
import type { PatientParams } from '@/lib/patients/href'
import { goalsOf, type Patient } from '@/lib/patients/queries'
import { formatTimeline } from '@/lib/patients/timeline-format'
import { adrValues, drpValues, halValues, patientValues, techValues, visitValues } from '@/lib/records/form-values'
import { lastMedRec, loadRecord, previousTechnique } from '@/lib/records/load'
import type { RecordKind } from '@/lib/records/schemas'
import { bangkokDate } from '@/lib/thai-date'
import { clinicName, patientHref } from '../parts'
import { AdrForm } from './adr-form'
import { CancelForm } from './cancel-form'
import { DrpForm } from './drp-form'
import { HalForm } from './hal-form'
import { PatientForm } from './patient-form'
import { TechForm } from './tech-form'
import { VisitForm } from './visit-form'

// camelCase Drizzle row → snake_case keys formatTimeline expects.
const snake = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), v]))

function Notice({ title, text, closeHref }: { title: string; text: string; closeHref: string }) {
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <Link className="scrim" href={closeHref} aria-label="ปิด" scroll={false} replace />
      <div className="sheet-body panel">
        <div className="panel-hd">
          <h2 className="h2" style={{ flex: 1 }}>
            {title}
          </h2>
          <Link className="btn btn-ic btn-sm" href={closeHref} aria-label="ปิดแผง" style={{ width: 40 }} scroll={false} replace>
            <Icon name="close" />
          </Link>
        </div>
        <div className="sec">
          <div className="band warn" role="status">
            <Icon name="warn" />
            <span>{text}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Renders the panel asked for by ?form=…[&edit=id] or ?cancel=kind:id, if any.
export async function FormHost({ patient: p, user, sp }: { patient: Patient; user: CurrentUser; sp: PatientParams }) {
  const back = { tab: sp.tab, clinic: sp.clinic }
  const closeHref = patientHref(p.hn, { ...back, cancelled: sp.cancelled })
  const base = { hn: p.hn, patientLine: `${fullName(p)} · HN ${p.hn}`, closeHref, back }
  const today = bangkokDate()

  if (sp.cancel) {
    const [kind, id] = sp.cancel === 'patient' ? (['patient', p.id] as const) : (sp.cancel.split(':') as [string, string])
    if (!(kind === 'patient' || isCareKind(kind)) || !id) return null
    const row = await loadRecord(kind as RecordKind, id, p.id)
    if (!row || row.cancelledAt) return <Notice title="ยกเลิกรายการ" text="ไม่พบรายการนี้ หรือถูกยกเลิกไปแล้ว" closeHref={closeHref} />
    if (row.createdBy !== user.id) return <Notice title="ยกเลิกรายการ" text="ยกเลิกได้เฉพาะผู้ที่บันทึกรายการนี้" closeHref={closeHref} />
    const summary = kind === 'patient' ? `ทะเบียนผู้ป่วย HN ${p.hn}` : formatTimeline(kind, snake(row)).title
    return <CancelForm base={{ ...base, id }} kind={kind as RecordKind} title={kind === 'patient' ? 'ทะเบียนผู้ป่วย' : CARE_KINDS[kind].label} summary={summary} />
  }

  const form = sp.form
  if (!form || !(form === 'patient' || isCareKind(form))) return null
  const kind = form as RecordKind
  const id = kind === 'patient' ? p.id : sp.edit
  let row: Record<string, unknown> | null = null
  if (id) {
    row = await loadRecord(kind, id, p.id)
    const title = kind === 'patient' ? 'ข้อมูลผู้ป่วย' : CARE_KINDS[kind].title
    if (!row) return <Notice title={title} text="ไม่พบรายการนี้ โหลดหน้าใหม่" closeHref={closeHref} />
    if (row.cancelledAt) return <Notice title={title} text="รายการนี้ถูกยกเลิกแล้ว แก้ไขไม่ได้" closeHref={closeHref} />
    if (row.createdBy !== user.id) return <Notice title={title} text={`แก้ไขได้เฉพาะผู้ที่บันทึกรายการนี้ (${row.createdByName})`} closeHref={closeHref} />
  }
  const editBase = { ...base, id: id ?? undefined }

  switch (kind) {
    case 'visit': {
      const initial = visitValues(row, { today, clinic: clinicName(sp.clinic) ? sp.clinic! : null, lastMedRec: row ? [] : await lastMedRec(p.id) })
      return <VisitForm base={editBase} initial={initial} patient={{ birthDate: p.birthDate, sex: p.sex, goals: goalsOf(p) }} />
    }
    case 'drp':
      return <DrpForm base={editBase} initial={drpValues(row, today)} />
    case 'hal':
      return <HalForm base={editBase} initial={halValues(row, today)} />
    case 'adr':
      return <AdrForm base={editBase} initial={adrValues(row, today)} />
    case 'tech':
      return <TechForm base={editBase} initial={techValues(row, today)} previous={await previousTechnique(p.id, id)} />
    case 'patient':
      return <PatientForm base={editBase} initial={patientValues(row!)} cancelHref={patientHref(p.hn, { ...back, cancel: 'patient' })} />
  }
}
