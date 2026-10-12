'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { Err, Multi, Panel, Section, TextField, UnitField } from '@/components/form-controls'
import { ageOn } from '@/lib/calc/dates'
import { egfrCkdEpi2021, type Sex } from '@/lib/calc/egfr'
import { a1cAtTarget, bpAtTarget, ldlAtTarget, type Goals } from '@/lib/calc/targets'
import { CARE_KINDS } from '@/lib/care-kinds'
import { ADHERENCE_METHOD, CLINIC, MED_REC_STATUS } from '@/lib/codes'
import type { MedRecRow, VisitValues } from '@/lib/records/form-values'
import { useSave, type FormBase } from './use-save'

const toNum = (v: string) => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v))

export function VisitForm({ base, initial, patient }: { base: FormBase; initial: VisitValues; patient: { birthDate: string | null; sex: string | null; goals: Goals } }) {
  const [v, setV] = useState(initial)
  const { save, pending, errors, message, clear } = useSave('visit', base)
  const set = <K extends keyof VisitValues>(k: K) => (val: VisitValues[K]) => {
    setV((p) => ({ ...p, [k]: val }))
    clear(k)
  }
  const setRow = (i: number, patch: Partial<MedRecRow>) => {
    setV((p) => ({ ...p, medRec: p.medRec.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
    clear('medRec')
  }
  const meta = CARE_KINDS.visit

  const scr = toNum(v.scr)
  const egfr = scr != null ? egfrCkdEpi2021(scr, ageOn(patient.birthDate, v.date || '2000-01-01'), patient.sex as Sex | null) : null
  const a1c = toNum(v.a1c)
  const sbp = toNum(v.sbp)
  const ldl = toNum(v.ldl)
  const flags: { label: string; bad: boolean }[] = []
  if (a1c != null) flags.push({ label: a1cAtTarget(a1c, patient.goals) ? 'HbA1c ถึงเป้า' : 'HbA1c สูงกว่าเป้า', bad: !a1cAtTarget(a1c, patient.goals) })
  if (sbp != null) flags.push({ label: bpAtTarget(sbp, toNum(v.dbp), patient.goals) ? 'BP ถึงเป้า' : 'BP สูงกว่าเป้า', bad: !bpAtTarget(sbp, toNum(v.dbp), patient.goals) })
  if (ldl != null) flags.push({ label: ldlAtTarget(ldl, patient.goals) ? 'LDL ถึงเป้า' : 'LDL สูงกว่าเป้า', bad: !ldlAtTarget(ldl, patient.goals) })
  const adherence = toNum(v.adherencePct)
  const mismatch = v.medRec.filter((r) => r.status === 'mismatch').length

  return (
    <Panel
      title="ติดตามโรคเรื้อรัง (Visit)"
      subtitle={`${base.patientLine}${v.clinicCode && v.clinicCode in CLINIC ? ` · คลินิก${CLINIC[v.clinicCode as keyof typeof CLINIC]}` : ''}`}
      icon={meta.icon}
      tone={meta.tone}
      closeHref={base.closeHref}
      saveLabel={base.id ? 'บันทึกการแก้ไข' : 'บันทึก Visit'}
      pending={pending}
      message={message}
      onSubmit={() => save(v)}
    >
      <Section n={1} title="วันที่และค่าแล็บ">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <TextField id="date" label="วันที่" type="date" value={v.date} onChange={set('date')} error={errors.date} />
          <div className="field">
            <label className="label" htmlFor="clinic">
              คลินิก
            </label>
            <select id="clinic" className="input" value={v.clinicCode} onChange={(e) => set('clinicCode')(e.target.value)}>
              <option value="">– ไม่ระบุ –</option>
              {Object.entries(CLINIC).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <UnitField id="sbp" label="SBP" unit="mmHg" value={v.sbp} onChange={set('sbp')} error={errors.sbp} />
          <UnitField id="dbp" label="DBP" unit="mmHg" value={v.dbp} onChange={set('dbp')} error={errors.dbp} />
          <UnitField id="fbs" label="FBS" unit="mg/dL" value={v.fbs} onChange={set('fbs')} error={errors.fbs} />
          <UnitField id="a1c" label="HbA1c" unit="%" decimal value={v.a1c} onChange={set('a1c')} error={errors.a1c} warn={a1c != null && !a1cAtTarget(a1c, patient.goals)} />
          <UnitField id="ldl" label="LDL" unit="mg/dL" value={v.ldl} onChange={set('ldl')} error={errors.ldl} />
          <UnitField id="scr" label="SCr" unit="mg/dL" decimal value={v.scr} onChange={set('scr')} error={errors.scr} />
        </div>
        {(egfr != null || flags.length > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} aria-live="polite">
            {egfr != null && <span className="chip info">eGFR (CKD-EPI) {egfr} mL/min/1.73m²</span>}
            {flags.map((f) => (
              <span key={f.label} className={`chip ${f.bad ? 'bad' : 'ok'}`}>
                {f.label}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section n={2} title="ความร่วมมือในการใช้ยา">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 120 }}>
            <UnitField id="adherence" label="" unit="%" value={v.adherencePct} onChange={set('adherencePct')} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="bar">
              <div style={{ width: `${Math.min(adherence ?? 0, 100)}%` }} />
            </div>
            <div className="xs faint" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>0</span>
              <span>เกณฑ์ดี ≥ 80%</span>
              <span>100</span>
            </div>
          </div>
        </div>
        <Err id="adherence" msg={errors.adherencePct} />
        <Multi id="methods" label="วิธีประเมิน (เลือกได้หลายข้อ)" options={ADHERENCE_METHOD} value={v.adherenceMethods} onChange={set('adherenceMethods')} />
      </Section>

      <Section
        n={3}
        title="รายการยาที่ใช้จริง"
        aside={mismatch > 0 ? <span className="chip warn" style={{ fontSize: 12 }}>ไม่ตรง {mismatch} รายการ</span> : undefined}
      >
        <div className="scroll-x" style={{ border: '1px solid var(--line)', borderRadius: 14 }}>
          <table className="tbl medrec" style={{ fontSize: 13.5, minWidth: 460 }}>
            <thead>
              <tr>
                <th>ยา</th>
                <th>แพทย์สั่ง</th>
                <th>ใช้จริง</th>
                <th>สถานะ</th>
                <th aria-label="ลบ" />
              </tr>
            </thead>
            <tbody>
              {v.medRec.map((r, i) => (
                <tr key={i} style={r.status === 'mismatch' ? { background: 'var(--warn-bg)' } : undefined}>
                  <td>
                    <input aria-label={`ยา แถว ${i + 1}`} value={r.drug} onChange={(e) => setRow(i, { drug: e.target.value })} style={{ fontWeight: 600 }} />
                  </td>
                  <td>
                    <input aria-label={`แพทย์สั่ง แถว ${i + 1}`} value={r.ordered} onChange={(e) => setRow(i, { ordered: e.target.value })} />
                  </td>
                  <td>
                    <input aria-label={`ใช้จริง แถว ${i + 1}`} value={r.actual} onChange={(e) => setRow(i, { actual: e.target.value })} />
                  </td>
                  <td>
                    <select aria-label={`สถานะ แถว ${i + 1}`} value={r.status} onChange={(e) => setRow(i, { status: e.target.value as MedRecRow['status'] })}>
                      <option value="">–</option>
                      {Object.entries(MED_REC_STATUS).map(([code, text]) => (
                        <option key={code} value={code}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button type="button" className="btn btn-ic btn-sm" aria-label={`ลบแถว ${i + 1}`} style={{ width: 32, minHeight: 32 }} onClick={() => set('medRec')(v.medRec.filter((_, j) => j !== i))}>
                      <Icon name="close" size="sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Err id="medRec" msg={errors.medRec} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-sm" onClick={() => set('medRec')([...v.medRec, { drug: '', ordered: '', actual: '', status: '' }])}>
            <Icon name="plus" size="sm" />
            เพิ่มรายการยา
          </button>
          {v.medRec.some((r) => r.drug && !r.status) && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => set('medRec')(v.medRec.map((r) => (r.drug && !r.status ? { ...r, actual: r.actual || r.ordered, status: 'match' } : r)))}
            >
              <Icon name="check" size="sm" />
              ที่เหลือใช้ตรงตามสั่ง
            </button>
          )}
        </div>
      </Section>

      <Section n={4} title="SOAP">
        <TextField id="s" label="S — Subjective" multiline value={v.soapS} onChange={set('soapS')} error={errors.soapS} />
        <TextField id="o" label="O — Objective" multiline value={v.soapO} onChange={set('soapO')} error={errors.soapO} />
        <TextField id="a" label="A — Assessment" multiline value={v.soapA} onChange={set('soapA')} error={errors.soapA} />
        <TextField id="p" label="P — Plan" multiline value={v.soapP} onChange={set('soapP')} error={errors.soapP} />
      </Section>
    </Panel>
  )
}
