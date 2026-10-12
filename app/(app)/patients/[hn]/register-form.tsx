'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Icon } from '@/components/icons'
import { CLINIC, SEX } from '@/lib/codes'
import { registerPatient, type RegisterState } from './actions'

type Prefill = { fullName?: string; sex?: string; age?: string; clinic?: string }

export function RegisterForm({ hn, prefill, fromHis }: { hn: string; prefill: Prefill; fromHis: boolean }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerPatient, undefined)
  const [sex, setSex] = useState(prefill.sex ?? '')
  const [clinic, setClinic] = useState(prefill.clinic ?? '')
  // Controlled: React resets uncontrolled fields after every action, which would
  // wipe what was typed whenever validation fails.
  const [fullName, setFullName] = useState(prefill.fullName ?? '')
  const [age, setAge] = useState(prefill.age ?? '')
  const [allergy, setAllergy] = useState('')
  const e = state?.errors ?? {}
  const describe = (k: string) => (e[k as keyof typeof e] ? `${k}-err` : undefined)

  return (
    <form action={action} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <input type="hidden" name="hn" value={hn} />
      {state?.message && (
        <div className="band dan" role="alert">
          <Icon name="alert" />
          <span>{state.message}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 16 }}>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="label" htmlFor="nm" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ชื่อ-สกุล{fromHis && <span className="tag">จาก HIS</span>}
          </label>
          <input
            id="nm"
            name="fullName"
            className={`input${e.fullName ? ' err' : ''}`}
            placeholder="เช่น นางทดลอง ข้อมูลใหม่"
            value={fullName}
            onChange={(ev) => setFullName(ev.target.value)}
            aria-invalid={!!e.fullName}
            aria-describedby={describe('fullName')}
            autoFocus={!prefill.fullName}
          />
          {e.fullName && <span id="fullName-err" className="err-tx">{e.fullName}</span>}
        </div>

        <div className="field">
          <span className="label" id="sex-l">เพศ</span>
          <div className="seg" role="radiogroup" aria-labelledby="sex-l" aria-describedby={describe('sex')}>
            {Object.entries(SEX).map(([code, text]) => (
              <button key={code} type="button" role="radio" aria-checked={sex === code} className={sex === code ? 'on' : ''} onClick={() => setSex(code)}>
                {text}
              </button>
            ))}
          </div>
          <input type="hidden" name="sex" value={sex} />
          {e.sex && <span id="sex-err" className="err-tx">{e.sex}</span>}
        </div>

        <div className="field">
          <label className="label" htmlFor="age">
            อายุ (ปี)
          </label>
          <input
            id="age"
            name="age"
            className={`input${e.age ? ' err' : ''}`}
            inputMode="numeric"
            placeholder="ปี"
            value={age}
            onChange={(ev) => setAge(ev.target.value)}
            aria-invalid={!!e.age}
            aria-describedby={describe('age')}
          />
          {e.age && <span id="age-err" className="err-tx">{e.age}</span>}
        </div>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <legend className="label" style={{ marginBottom: 8 }}>
          คลินิกวันนี้ <span className="faint xs" style={{ fontWeight: 500 }}>เลือกเอง</span>
        </legend>
        <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 10 }}>
          {Object.entries(CLINIC).map(([code, text]) => (
            <button
              key={code}
              type="button"
              className={`opt${clinic === code ? ' on' : ''}`}
              role="radio"
              aria-checked={clinic === code}
              onClick={() => setClinic(clinic === code ? '' : code)}
            >
              <span className="radio" />
              {text}
            </button>
          ))}
        </div>
        <input type="hidden" name="clinic" value={clinic} />
        {e.clinic && <span className="err-tx">{e.clinic}</span>}
      </fieldset>

      <div className="field">
        <label className="label" htmlFor="alg">
          ประวัติแพ้ยา
        </label>
        <input
          id="alg"
          name="allergy"
          className="input"
          placeholder="ชื่อยาและอาการ หรือเว้นว่างหากไม่มี / ไม่ทราบ"
          value={allergy}
          onChange={(ev) => setAllergy(ev.target.value)}
        />
        {e.allergy && <span className="err-tx">{e.allergy}</span>}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: 4 }}>
        <Link className="btn" href="/">
          ยกเลิก
        </Link>
        <button type="submit" className="btn btn-pri" disabled={pending} style={{ minHeight: 48, padding: '0 24px', fontSize: 16 }}>
          <Icon name="userPlus" />
          {pending ? 'กำลังลงทะเบียน…' : 'ลงทะเบียนผู้ป่วย'}
        </button>
      </div>
    </form>
  )
}
