'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { Choice, Err, Panel, Section, Seg, TextField } from '@/components/form-controls'
import { scoreTechnique, type StepResult } from '@/lib/calc/technique'
import { CARE_KINDS } from '@/lib/care-kinds'
import { buildStepSnapshot, CHECKLIST_SOURCE, CHECKLISTS, educationTopics, type Device, type DeviceGroup } from '@/lib/checklists'
import { DEVICE, DRUG_USER, TECHNIQUE_PHASE } from '@/lib/codes'
import type { TechValues } from '@/lib/records/form-values'
import { useSave, type FormBase } from './use-save'

const DEVICE_GROUPS: [DeviceGroup, string][] = [
  ['inhaler', 'ยาสูด'],
  ['insulin', 'อินซูลิน'],
  ['other', 'อื่น ๆ'],
]

// Device name with the example products from the source underneath.
function deviceOptions(group: DeviceGroup) {
  return Object.fromEntries(
    (Object.keys(DEVICE) as Device[])
      .filter((d) => CHECKLISTS[d].group === group)
      .map((d) => [
        d,
        <span key={d} style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{DEVICE[d]}</span>
          {CHECKLISTS[d].examples && <span className="xs" style={{ fontWeight: 500, color: 'var(--tx2)' }}>{CHECKLISTS[d].examples}</span>}
        </span>,
      ]),
  )
}

export function TechForm({ base, initial, previous }: { base: FormBase; initial: TechValues; previous: Record<string, string> }) {
  const [v, setV] = useState(initial)
  const { save, pending, errors, message, clear } = useSave('tech', base)
  const set = <K extends keyof TechValues>(k: K) => (val: TechValues[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    clear(k)
  }
  const meta = CARE_KINDS.tech

  // Switching device loads that device's checklist; switching back to the
  // stored device (when editing) restores what was assessed.
  function pickDevice(device: string) {
    const d = device as Device
    if (d === v.device) return
    const steps = d === initial.device ? initial.steps : buildStepSnapshot(d).map(({ text, critical }) => ({ text, critical }))
    const results = d === initial.device ? initial.results : steps.map(() => null)
    setV((p) => ({ ...p, device: d, steps, results, education: [] }))
    clear('results')
  }
  const mark = (i: number, r: Exclude<StepResult, null>) => set('results')(v.results.map((x, j) => (j === i ? (x === r ? null : r) : x)))

  const score = scoreTechnique(v.steps.map((st, i) => ({ ...st, result: v.results[i] })))
  const verdict = score.assessed < score.total ? { text: 'ยังประเมินไม่ครบ', cls: 'mute' } : score.criticalAllPassed ? { text: 'ขั้นสำคัญครบ', cls: 'ok' } : { text: 'ขั้นสำคัญยังไม่ครบ', cls: 'bad' }
  const topics = educationTopics(v.device)
  const guide = CHECKLISTS[v.device]
  const fromSite = guide.errors !== undefined

  return (
    <Panel
      title="สอนเทคนิคการใช้ยา"
      subtitle={base.patientLine}
      icon={meta.icon}
      tone={meta.tone}
      closeHref={base.closeHref}
      saveLabel={base.id ? 'บันทึกการแก้ไข' : 'บันทึกการสอน'}
      pending={pending}
      message={message}
      onSubmit={() => save({ ...v, steps: undefined })}
    >
      <Section n={1} title="เลือกอุปกรณ์">
        {DEVICE_GROUPS.map(([group, title]) => (
          <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="label">{title}</span>
            <Choice id={`device-${group}`} label={title} options={deviceOptions(group)} value={v.device} onChange={pickDevice} />
          </div>
        ))}
        <Err id="device" msg={errors.device} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="drug" label="ชื่อยา" value={v.drug} onChange={set('drug')} error={errors.drug} />
          <TextField id="date" label="วันที่" type="date" value={v.date} onChange={set('date')} error={errors.date} />
        </div>
        <Seg id="phase" label="รอบการประเมิน" options={TECHNIQUE_PHASE} value={v.phase} onChange={set('phase')} error={errors.phase} />
        <Seg id="drugUser" label="ผู้ใช้ยา" options={DRUG_USER} value={v.drugUser} onChange={set('drugUser')} />
      </Section>

      <div className="sec" style={{ background: 'var(--pri-50)', gap: 10, position: 'sticky', top: 76, zIndex: 1, borderBottomColor: 'var(--pri-100)' }} aria-live="polite">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span className="label">ทำถูกต้อง</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--h)', lineHeight: 1.1 }} data-testid="tech-score">
                {score.pct}%
              </span>
              <span className="muted sm">
                {score.passed} จาก {score.total} ขั้น
              </span>
            </span>
          </div>
          <span className={`chip ${verdict.cls}`}>{verdict.text}</span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={score.pct} aria-valuemin={0} aria-valuemax={100} aria-label="เปอร์เซ็นต์ที่ทำถูก" style={{ background: 'var(--card)' }}>
          <div style={{ width: `${score.pct}%` }} />
        </div>
        <div className="xs muted" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>
            ขั้นสำคัญถูก {score.criticalPassed}/{score.criticalTotal}
          </span>
          <span>
            ประเมินแล้ว {score.assessed}/{score.total}
          </span>
          <span>ครั้งก่อน {previous[v.device] ?? '—'}</span>
        </div>
      </div>

      <Section n={2} title={`ประเมินทีละขั้น — ${DEVICE[v.device]}`}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {v.steps.map((st, i) => {
            const r = v.results[i]
            const tint = r === 'pass' ? { bg: 'var(--ok-bg)', bd: 'var(--ok-bd)' } : r === 'fail' ? { bg: 'var(--dan-bg)', bd: 'var(--dan-bd)' } : { bg: 'var(--card)', bd: 'var(--line)' }
            return (
              <li key={`${v.device}-${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 14, border: `1px solid ${tint.bd}`, background: tint.bg }}>
                <span className="step-n" style={{ marginTop: 1 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>
                    {st.text}
                    {st.critical && (
                      <span className="chip bad" style={{ fontSize: 11, padding: '0 8px', marginLeft: 6, verticalAlign: 2 }}>
                        สำคัญ
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }} role="group" aria-label={`ขั้นที่ ${i + 1}`}>
                    <button type="button" className="btn btn-sm pass" aria-pressed={r === 'pass'} onClick={() => mark(i, 'pass')}>
                      <Icon name="check" size="sm" />
                      ถูก
                    </button>
                    <button type="button" className="btn btn-sm fail" aria-pressed={r === 'fail'} onClick={() => mark(i, 'fail')}>
                      <Icon name="close" size="sm" />
                      ไม่ถูก
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
        <Err id="results" msg={errors.results} />
        {(guide.errors?.length || guide.tip) && (
          <div className="guide-box">
            {guide.errors && guide.errors.length > 0 && (
              <>
                <span className="label">ข้อผิดพลาดที่พบบ่อย</span>
                <ul>
                  {guide.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            )}
            {guide.tip && (
              <>
                <span className="label">คำแนะนำ</span>
                <ul>
                  {guide.tip.split(' · ').map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </>
            )}
            {fromSite && (
              <span className="faint xs">
                ที่มา:{' '}
                <a href={CHECKLIST_SOURCE.url} target="_blank" rel="noreferrer">
                  {CHECKLIST_SOURCE.name}
                </a>
              </span>
            )}
          </div>
        )}
      </Section>

      <Section n={3} title="ความรู้ที่ให้และข้อแนะนำ">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topics.map((t) => (
            <label key={t} className="sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                checked={v.education.includes(t)}
                onChange={(e) => set('education')(e.target.checked ? [...v.education, t] : v.education.filter((x) => x !== t))}
                style={{ width: 18, height: 18, marginTop: 2, accentColor: 'var(--pri)' }}
              />
              {t}
            </label>
          ))}
        </div>
        <TextField id="problem" label="ปัญหาที่พบและการแก้ไข" multiline value={v.problem} onChange={set('problem')} error={errors.problem} />
        <TextField id="advice" label="ข้อแนะนำเพิ่มเติม" multiline placeholder="เช่น ทวนขั้นค้างเข็ม 10 วินาที ให้ผู้ป่วยนับในใจ" value={v.advice} onChange={set('advice')} error={errors.advice} />
        <TextField id="aids" label="สื่อ/อุปกรณ์ที่ให้" value={v.aids} onChange={set('aids')} error={errors.aids} />
      </Section>
    </Panel>
  )
}
