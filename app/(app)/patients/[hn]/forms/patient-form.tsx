'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Multi, Panel, Section, Seg, TextField, UnitField } from '@/components/form-controls'
import { CLINIC, SEX } from '@/lib/codes'
import type { PatientValues } from '@/lib/records/form-values'
import { PATIENT_CONDITIONS } from '@/lib/records/schemas'
import { useSave, type FormBase } from './use-save'

const CONDITIONS = Object.fromEntries(PATIENT_CONDITIONS.map((c) => [c, c]))

export function PatientForm({ base, initial, cancelHref }: { base: FormBase; initial: PatientValues; cancelHref: string }) {
  const [v, setV] = useState(initial)
  const { save, pending, errors, message, clear } = useSave('patient', base)
  const set = <K extends keyof PatientValues>(k: K) => (val: PatientValues[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    clear(k)
  }

  return (
    <Panel
      title="ข้อมูลผู้ป่วย"
      subtitle={base.patientLine}
      icon="userPlus"
      tone={{}}
      closeHref={base.closeHref}
      saveLabel="บันทึกข้อมูลผู้ป่วย"
      pending={pending}
      message={message}
      onSubmit={() => save(v)}
      footerExtra={
        <Link className="btn btn-out-dan" href={cancelHref} scroll={false} replace style={{ marginRight: 'auto' }}>
          ยกเลิกทะเบียน
        </Link>
      }
    >
      <Section n={1} title="ข้อมูลทั่วไป">
        <TextField id="fullName" label="ชื่อ-สกุล" value={v.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Seg id="sex" label="เพศ" options={SEX} value={v.sex} onChange={set('sex')} error={errors.sex} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="birthDate" label="วันเกิด" type="date" value={v.birthDate} onChange={(d) => {
            setV((p) => ({ ...p, birthDate: d, birthDateEstimated: false }))
            clear('birthDate')
          }} error={errors.birthDate} />
          <UnitField id="weight" label="น้ำหนัก" unit="กก." decimal value={v.weightKg} onChange={set('weightKg')} error={errors.weightKg} />
        </div>
        {v.birthDateEstimated && <span className="xs muted">วันเกิดประมาณจากอายุที่กรอกตอนลงทะเบียน แก้เป็นวันเกิดจริงได้</span>}
        <div className="field">
          <label className="label" htmlFor="clinic">
            คลินิกหลัก
          </label>
          <select id="clinic" className="input" value={v.mainClinicCode} onChange={(e) => set('mainClinicCode')(e.target.value)}>
            <option value="">– ไม่ระบุ –</option>
            {Object.entries(CLINIC).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <Multi id="conditions" label="โรคประจำตัว" options={CONDITIONS} value={v.conditions} onChange={set('conditions')} />
        <TextField id="allergy" label="ประวัติแพ้ยา (สรุป)" placeholder="เว้นว่างถ้าไม่มี รายละเอียดบันทึกใน ADR / แพ้ยา" value={v.allergySummary} onChange={set('allergySummary')} error={errors.allergySummary} />
      </Section>

      <Section n={2} title="เป้าหมายรายบุคคล">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <UnitField id="goalA1c" label="HbA1c ต่ำกว่า" unit="%" decimal value={v.goalA1c} onChange={set('goalA1c')} error={errors.goalA1c} />
          <UnitField id="goalLdl" label="LDL ต่ำกว่า" unit="mg/dL" value={v.goalLdl} onChange={set('goalLdl')} error={errors.goalLdl} />
          <UnitField id="goalSbp" label="SBP ต่ำกว่า" unit="mmHg" value={v.goalSbp} onChange={set('goalSbp')} error={errors.goalSbp} />
          <UnitField id="goalDbp" label="DBP ต่ำกว่า" unit="mmHg" value={v.goalDbp} onChange={set('goalDbp')} error={errors.goalDbp} />
        </div>
      </Section>

      <Section n={3} title="หมายเหตุ">
        <TextField id="note" label="หมายเหตุ" multiline value={v.note} onChange={set('note')} error={errors.note} />
      </Section>
    </Panel>
  )
}
