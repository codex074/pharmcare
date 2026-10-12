'use client'

import { useState } from 'react'
import { Choice, Err, Multi, Panel, Section, Seg, TextField } from '@/components/form-controls'
import { CARE_KINDS } from '@/lib/care-kinds'
import { DRP_ACCEPTANCE, DRP_CATEGORY, DRP_INTERVENTION, DRP_OUTCOME, NCC_MERP, NCC_MERP_DESC } from '@/lib/codes'
import type { DrpValues } from '@/lib/records/form-values'
import { useSave, type FormBase } from './use-save'

const MERP_GROUP = (k: string) => ('AB'.includes(k) ? 'mute' : 'CD'.includes(k) ? 'info' : 'EFGH'.includes(k) ? 'warn' : 'bad')
const categoryLabels = Object.fromEntries(Object.entries(DRP_CATEGORY).map(([k, v]) => [k, v.replace(/^\d /, '')]))

export function DrpForm({ base, initial }: { base: FormBase; initial: DrpValues }) {
  const [v, setV] = useState(initial)
  const { save, pending, errors, message, clear } = useSave('drp', base)
  const set = <K extends keyof DrpValues>(k: K) => (val: DrpValues[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    clear(k)
  }
  const meta = CARE_KINDS.drp
  const merp = v.nccMerp as keyof typeof NCC_MERP | ''

  return (
    <Panel
      title="ปัญหาจากการใช้ยา (DRP)"
      subtitle={base.patientLine}
      icon={meta.icon}
      tone={meta.tone}
      closeHref={base.closeHref}
      saveLabel={base.id ? 'บันทึกการแก้ไข' : 'บันทึก DRP'}
      pending={pending}
      message={message}
      onSubmit={() => save(v)}
    >
      <Section n={1} title="ประเภทปัญหา">
        <Choice id="category" label="ประเภท DRP" options={categoryLabels} value={v.category} onChange={set('category')} error={errors.category} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="date" label="วันที่พบ" type="date" value={v.date} onChange={set('date')} error={errors.date} />
          <TextField id="drug" label="ยาที่เกี่ยวข้อง" value={v.drug} onChange={set('drug')} error={errors.drug} />
        </div>
        <TextField id="detail" label="รายละเอียดปัญหาและสาเหตุ" multiline value={v.detail} onChange={set('detail')} error={errors.detail} />
      </Section>

      <Section n={2} title="ความรุนแรง (NCC MERP)" aside={merp ? <span className={`chip ${MERP_GROUP(merp)}`}>ระดับ {merp}</span> : undefined}>
        <div className="merp" role="radiogroup" aria-label="ระดับความรุนแรง">
          {Object.keys(NCC_MERP).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={merp === k} className={merp === k ? 'on' : ''} onClick={() => set('nccMerp')(merp === k ? '' : k)}>
              {k}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 4fr 1fr', gap: 6 }} className="xs muted">
          <span style={{ borderTop: '2px solid var(--line)', paddingTop: 4 }}>ไม่ถึงผู้ป่วย</span>
          <span style={{ borderTop: '2px solid var(--info-bd)', paddingTop: 4 }}>ไม่เกิดอันตราย</span>
          <span style={{ borderTop: '2px solid var(--warn-bd)', paddingTop: 4 }}>เกิดอันตราย</span>
          <span style={{ borderTop: '2px solid var(--dan-bd)', paddingTop: 4 }}>เสียชีวิต</span>
        </div>
        {merp && (
          <div className="band info" style={{ fontWeight: 500, fontSize: 13.5, alignItems: 'flex-start' }}>
            <span className="tag" style={{ fontSize: 12 }}>
              {merp}
            </span>
            <span>{NCC_MERP_DESC[merp]}</span>
          </div>
        )}
        <Err id="nccMerp" msg={errors.nccMerp} />
      </Section>

      <Section n={3} title="การแก้ไข (เลือกได้หลายข้อ)">
        <Multi id="interventions" options={DRP_INTERVENTION} value={v.interventions} onChange={set('interventions')} error={errors.interventions} />
        <TextField id="rec" label="ข้อเสนอต่อแพทย์" multiline value={v.recommendation} onChange={set('recommendation')} error={errors.recommendation} />
      </Section>

      <Section n={4} title="การตอบรับของแพทย์">
        <Seg id="acceptance" label="การตอบรับ" options={DRP_ACCEPTANCE} value={v.acceptance} onChange={set('acceptance')} error={errors.acceptance} />
      </Section>

      <Section n={5} title="ผลลัพธ์">
        <Choice id="outcome" label="ผลลัพธ์" options={DRP_OUTCOME} value={v.outcome} onChange={set('outcome')} error={errors.outcome} />
        {v.outcome !== 'pending' && (
          <TextField id="outcomeDate" label="วันที่ประเมินผลลัพธ์ (เว้นว่าง = วันนี้)" type="date" value={v.outcomeDate} onChange={set('outcomeDate')} error={errors.outcomeDate} />
        )}
        <TextField id="note" label="บันทึกผลการติดตาม" multiline value={v.followUpNote} onChange={set('followUpNote')} error={errors.followUpNote} />
      </Section>
    </Panel>
  )
}
