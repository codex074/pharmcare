'use client'

import { useState } from 'react'
import { Choice, Multi, Panel, Section, TextField, UnitField } from '@/components/form-controls'
import { inRange } from '@/lib/calc/targets'
import { CARE_KINDS } from '@/lib/care-kinds'
import { HIGH_ALERT_ACTION, HIGH_ALERT_DRUG, HIGH_ALERT_EVENT, HIGH_ALERT_FACTOR } from '@/lib/codes'
import type { HalValues } from '@/lib/records/form-values'
import { useSave, type FormBase } from './use-save'

// No board for this form; it follows the others' layout with the prototype's fields.
export function HalForm({ base, initial }: { base: FormBase; initial: HalValues }) {
  const [v, setV] = useState(initial)
  const { save, pending, errors, message, clear } = useSave('hal', base)
  const set = <K extends keyof HalValues>(k: K) => (val: HalValues[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    clear(k)
  }
  const meta = CARE_KINDS.hal

  const [value, low, high] = [v.value, v.targetLow, v.targetHigh].map((x) => (x.trim() && Number.isFinite(Number(x)) ? Number(x) : null))
  const verdict = value != null && low != null && high != null && low < high ? (inRange(value, low, high) ? 'in' : value < low ? 'low' : 'high') : null

  return (
    <Panel
      title="ติดตามยาความเสี่ยงสูง"
      subtitle={base.patientLine}
      icon={meta.icon}
      tone={meta.tone}
      closeHref={base.closeHref}
      saveLabel={base.id ? 'บันทึกการแก้ไข' : 'บันทึกการติดตาม'}
      pending={pending}
      message={message}
      onSubmit={() => save(v)}
    >
      <Section n={1} title="ยา">
        <Choice id="drug" label="ยา" options={HIGH_ALERT_DRUG} value={v.drug} onChange={set('drug')} error={errors.drug} />
        {v.drug === 'other' && <TextField id="drugOther" label="ชื่อยา" value={v.drugOther} onChange={set('drugOther')} error={errors.drugOther} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="date" label="วันที่" type="date" value={v.date} onChange={set('date')} error={errors.date} />
          <TextField id="indication" label="ข้อบ่งใช้" value={v.indication} onChange={set('indication')} error={errors.indication} />
        </div>
        <TextField id="dose" label="ขนาดยาปัจจุบัน" placeholder="เช่น 21 มก./สัปดาห์" value={v.dose} onChange={set('dose')} error={errors.dose} />
      </Section>

      <Section
        n={2}
        title="ผลที่ติดตาม"
        aside={verdict && <span className={`chip ${verdict === 'in' ? 'ok' : 'bad'}`}>{verdict === 'in' ? 'ในช่วงเป้า' : verdict === 'low' ? 'ต่ำกว่าเป้า' : 'สูงกว่าเป้า'}</span>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="parameter" label="ค่าที่ติดตาม" value={v.parameter} onChange={set('parameter')} error={errors.parameter} />
          <UnitField id="value" label="ผลที่วัดได้" unit="" decimal value={v.value} onChange={set('value')} error={errors.value} />
          <UnitField id="low" label="เป้าหมาย: ต่ำสุด" unit="" decimal value={v.targetLow} onChange={set('targetLow')} error={errors.targetLow} />
          <UnitField id="high" label="เป้าหมาย: สูงสุด" unit="" decimal value={v.targetHigh} onChange={set('targetHigh')} error={errors.targetHigh} />
        </div>
      </Section>

      <Section n={3} title="เหตุการณ์และปัจจัย">
        <Multi id="events" label="เหตุการณ์ไม่พึงประสงค์" options={HIGH_ALERT_EVENT} value={v.events} onChange={set('events')} />
        <Multi id="factors" label="ปัจจัยที่มีผล" options={HIGH_ALERT_FACTOR} value={v.factors} onChange={set('factors')} />
      </Section>

      <Section n={4} title="การจัดการ">
        <Choice id="action" label="การจัดการ" options={HIGH_ALERT_ACTION} value={v.action} onChange={set('action')} error={errors.action} />
        <TextField id="plan" label="ขนาดยาใหม่และคำแนะนำ" multiline value={v.plan} onChange={set('plan')} error={errors.plan} />
      </Section>
    </Panel>
  )
}
