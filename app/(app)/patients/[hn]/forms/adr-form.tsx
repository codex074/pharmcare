'use client'

import { useState } from 'react'
import { Multi, Panel, Section, Seg, TextField } from '@/components/form-controls'
import { NARANJO_CATEGORY, NARANJO_QUESTIONS, naranjoAnswered, naranjoCategory, naranjoScore, type NaranjoAnswer } from '@/lib/calc/naranjo'
import { CARE_KINDS } from '@/lib/care-kinds'
import { ADR_ACTION, ADR_MANAGEMENT, ADR_RESULT, ADR_SERIOUSNESS, ADR_SEVERITY, ADR_TYPE, NARANJO_ANSWER } from '@/lib/codes'
import type { AdrValues } from '@/lib/records/form-values'
import { useSave, type FormBase } from './use-save'

const SCALE = [
  { key: 'doubtful', label: 'น่าสงสัย ≤0', color: 'var(--line)' },
  { key: 'possible', label: 'อาจจะใช่ 1–4', color: 'var(--info-bd)' },
  { key: 'probable', label: 'น่าจะใช่ 5–8', color: 'var(--warn-bd)' },
  { key: 'definite', label: 'ใช่แน่นอน ≥9', color: 'var(--dan-bd)' },
] as const
const CATEGORY_CHIP = { doubtful: 'mute', possible: 'info', probable: 'warn', definite: 'bad' } as const
const fmt = (n: number) => (n > 0 ? `+${n}` : String(n))

export function AdrForm({ base, initial }: { base: FormBase; initial: AdrValues }) {
  const [v, setV] = useState(initial)
  const { save, pending, errors, message, clear } = useSave('adr', base)
  const set = <K extends keyof AdrValues>(k: K) => (val: AdrValues[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    clear(k)
  }
  const meta = CARE_KINDS.adr

  const answers = v.naranjo as (NaranjoAnswer | null)[]
  const score = naranjoScore(answers)
  const answered = naranjoAnswered(answers)
  const category = naranjoCategory(score)
  const answer = (i: number, a: NaranjoAnswer) => set('naranjo')(answers.map((x, j) => (j === i ? (x === a ? null : a) : x)))

  return (
    <Panel
      title="ADR / แพ้ยา"
      subtitle={base.patientLine}
      icon={meta.icon}
      tone={meta.tone}
      closeHref={base.closeHref}
      saveLabel={base.id ? 'บันทึกการแก้ไข' : 'บันทึก ADR'}
      pending={pending}
      message={message}
      onSubmit={() => save(v)}
    >
      <Section n={1} title="ข้อมูลอาการ">
        <TextField id="drug" label="ยาที่สงสัย" value={v.drug} onChange={set('drug')} error={errors.drug} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="start" label="วันที่เริ่มยา" type="date" value={v.drugStartDate} onChange={set('drugStartDate')} error={errors.drugStartDate} />
          <TextField id="date" label="วันที่เกิดอาการ" type="date" value={v.date} onChange={set('date')} error={errors.date} />
        </div>
        <TextField id="reaction" label="อาการที่พบ" multiline value={v.reaction} onChange={set('reaction')} error={errors.reaction} />
        <Seg id="type" label="ชนิด" options={ADR_TYPE} value={v.type} onChange={set('type')} error={errors.type} />
        <Seg id="severity" label="ความรุนแรง" options={ADR_SEVERITY} value={v.severity} onChange={set('severity')} error={errors.severity} />
        <Multi id="management" label="การจัดการ" options={ADR_MANAGEMENT} value={v.management} onChange={set('management')} />
        <TextField id="mnote" label="รายละเอียดการจัดการ" multiline value={v.managementNote} onChange={set('managementNote')} error={errors.managementNote} />
      </Section>

      <div className="sec" style={{ background: 'var(--pri-50)', position: 'sticky', top: 76, zIndex: 1, borderBottomColor: 'var(--pri-100)', gap: 10 }} aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span className="label">คะแนน Naranjo</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--h)', lineHeight: 1.1 }} data-testid="naranjo-score">
                {score}
              </span>
              <span className="muted sm">ตอบแล้ว {answered}/10 ข้อ</span>
            </span>
          </div>
          <span className={`chip ${CATEGORY_CHIP[category]}`} style={{ fontSize: 14, padding: '6px 14px' }}>
            {NARANJO_CATEGORY[category]}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4 }} aria-hidden="true">
          {SCALE.map((s) => (
            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ height: 8, borderRadius: 999, background: s.key === category ? s.color : 'var(--line2)' }} />
              <span className="xs" style={{ color: s.key === category ? 'var(--tx)' : 'var(--tx3)', fontWeight: s.key === category ? 700 : 500 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Section n={2} title="แบบประเมิน Naranjo">
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {NARANJO_QUESTIONS.map((q, i) => (
            <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, border: '1px solid var(--line)', borderRadius: 14 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span className="step-n">{i + 1}</span>
                <span style={{ fontSize: 14.5, flex: 1 }}>{q.text}</span>
              </div>
              <div className="seg" role="radiogroup" aria-label={`คำตอบข้อ ${i + 1}`} style={{ display: 'flex' }}>
                {(Object.keys(NARANJO_ANSWER) as NaranjoAnswer[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={answers[i] === a}
                    className={answers[i] === a ? 'on' : ''}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    onClick={() => answer(i, a)}
                  >
                    {NARANJO_ANSWER[a]}
                    <span className="xs" style={{ fontWeight: 500, opacity: 0.75 }}>
                      {fmt(q[a])}
                    </span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section n={3} title="ผลลัพธ์และการดำเนินการ">
        <Seg id="seriousness" label="ความร้ายแรง" options={ADR_SERIOUSNESS} value={v.seriousness} onChange={set('seriousness')} error={errors.seriousness} />
        <Seg id="result" label="ผลลัพธ์" options={ADR_RESULT} value={v.result} onChange={set('result')} error={errors.result} />
        <Multi id="actions" label="การดำเนินการ" options={ADR_ACTION} value={v.actions} onChange={set('actions')} />
      </Section>
    </Panel>
  )
}
