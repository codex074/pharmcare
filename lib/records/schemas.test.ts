import { describe, expect, it } from 'vitest'
import { adrSchema, cancelSchema, drpSchema, formErrors, halSchema, patientSchema, techSchema, visitSchema } from './schemas'

const TODAY = '2026-10-12'
const errs = (r: { success: boolean; error?: Parameters<typeof formErrors>[0] }) => (r.success ? {} : formErrors(r.error!))

const visit = {
  date: TODAY,
  clinicCode: 'dm',
  sbp: '128',
  dbp: '78',
  fbs: '',
  a1c: '7.8',
  ldl: '',
  scr: '1.24',
  adherencePct: '85',
  adherenceMethods: ['interview'],
  medRec: [
    { drug: 'Metformin 500 mg', ordered: '2×2 pc', actual: '2×2 pc', status: 'match' },
    { drug: '', ordered: '', actual: '', status: '' },
  ],
  soapS: '',
  soapO: '',
  soapA: 'ok',
  soapP: '',
}

describe('visit', () => {
  it('parses numbers, drops blank med-rec rows and names the clinic', () => {
    const r = visitSchema(TODAY).safeParse(visit)
    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({ sbp: 128, a1c: 7.8, fbs: null, scr: 1.24, clinicName: 'เบาหวาน', soapS: null, soapA: 'ok' })
    expect(r.data!.medRec).toHaveLength(1)
  })

  it('rejects decimals in integer columns and extra decimals elsewhere', () => {
    const e = errs(visitSchema(TODAY).safeParse({ ...visit, sbp: '128.5', a1c: '7.85', scr: '1.234' }))
    expect(e).toEqual({ sbp: 'กรอกเป็นจำนวนเต็ม', a1c: 'ทศนิยมไม่เกิน 1 ตำแหน่ง', scr: 'ทศนิยมไม่เกิน 2 ตำแหน่ง' })
  })

  it('rejects future dates, out-of-range values and an empty med rec', () => {
    const e = errs(visitSchema(TODAY).safeParse({ ...visit, date: '2026-10-13', sbp: '400', medRec: [] }))
    expect(e.date).toBe('วันที่อยู่ในอนาคต')
    expect(e.sbp).toMatch(/50–300/)
    expect(e.medRec).toMatch(/อย่างน้อย 1 รายการ/)
  })

  it('needs a status for every listed drug', () => {
    const e = errs(visitSchema(TODAY).safeParse({ ...visit, medRec: [{ drug: 'Losartan', ordered: '1×1', actual: '', status: '' }] }))
    expect(e.medRec).toMatch(/แถวที่ 1/)
  })
})

describe('drp', () => {
  const drp = {
    date: '2026-10-01',
    drug: 'Insulin glargine',
    category: 'dose_too_low',
    nccMerp: 'D',
    detail: 'ฉีดจริง 16 u',
    interventions: ['technique'],
    recommendation: '',
    acceptance: 'accepted',
    outcome: 'pending',
    outcomeDate: '',
    followUpNote: '',
  }

  it('defaults the outcome date to today once closed', () => {
    expect(drpSchema(TODAY).parse({ ...drp, outcome: 'resolved' }).outcomeDate).toBe(TODAY)
    expect(drpSchema(TODAY).parse(drp).outcomeDate).toBeNull()
  })

  it('requires an intervention and an outcome date on or after the DRP date', () => {
    expect(errs(drpSchema(TODAY).safeParse({ ...drp, interventions: [] })).interventions).toMatch(/อย่างน้อย 1/)
    expect(errs(drpSchema(TODAY).safeParse({ ...drp, outcome: 'resolved', outcomeDate: '2026-09-30' })).outcomeDate).toMatch(/ไม่ก่อน/)
  })

  it('rejects codes outside lib/codes', () => {
    expect(errs(drpSchema(TODAY).safeParse({ ...drp, category: 'made_up', nccMerp: 'Z' }))).toMatchObject({
      category: 'เลือกประเภทปัญหา',
    })
  })
})

describe('high-alert', () => {
  const hal = {
    date: TODAY,
    drug: 'warfarin',
    drugOther: 'ignored',
    indication: 'AF',
    parameter: 'INR',
    value: '2.4',
    targetLow: '2',
    targetHigh: '3',
    dose: '',
    events: [],
    factors: [],
    action: 'maintain',
    plan: '',
  }

  it('parses and clears drug_other unless the drug is other', () => {
    expect(halSchema(TODAY).parse(hal)).toMatchObject({ value: 2.4, targetLow: 2, targetHigh: 3, drugOther: null })
  })

  it('needs low < high and a name for other drugs', () => {
    expect(errs(halSchema(TODAY).safeParse({ ...hal, targetLow: '3', targetHigh: '3' })).targetHigh).toMatch(/มากกว่า/)
    expect(errs(halSchema(TODAY).safeParse({ ...hal, drug: 'other', drugOther: '' })).drugOther).toBe('ระบุชื่อยา')
    expect(errs(halSchema(TODAY).safeParse({ ...hal, value: '' })).value).toBe('จำเป็นต้องกรอก')
  })
})

describe('adr', () => {
  const adr = {
    date: '2026-09-28',
    drug: 'Simvastatin 20 mg',
    drugStartDate: '2026-04-20',
    reaction: 'ปวดกล้ามเนื้อ',
    type: 'side_effect',
    severity: 'moderate',
    seriousness: '',
    naranjo: ['yes', 'yes', 'yes', 'unknown', 'no', null, null, null, null, null],
    management: ['stop_drug'],
    managementNote: '',
    result: '',
    actions: [],
  }

  it('computes the Naranjo score itself', () => {
    const r = adrSchema(TODAY).parse({ ...adr, naranjoScore: 99 } as typeof adr)
    expect(r.naranjoScore).toBe(6)
    expect(r).not.toHaveProperty('naranjo')
  })

  it('stores nothing when no question is answered', () => {
    expect(adrSchema(TODAY).parse({ ...adr, naranjo: Array(10).fill(null) })).toMatchObject({ naranjoAnswers: null, naranjoScore: null })
  })

  it('rejects a start date after onset', () => {
    expect(errs(adrSchema(TODAY).safeParse({ ...adr, drugStartDate: '2026-09-29' })).drugStartDate).toMatch(/ไม่หลัง/)
  })
})

describe('technique / patient / cancel', () => {
  it('takes results only — no score field is read', () => {
    const r = techSchema(TODAY).parse({
      date: TODAY, device: 'mdi', drug: 'Salbutamol', phase: 'post', drugUser: '',
      results: ['pass', 'fail', null], education: [], problem: '', advice: '', aids: '', scorePct: 100,
    } as never)
    expect(r).not.toHaveProperty('scorePct')
    expect(r.results).toEqual(['pass', 'fail', null])
  })

  it('splits the patient name and requires goals as integers', () => {
    const base = {
      fullName: 'นายสมมติ ทดสอบ', sex: 'male', birthDate: '1964-03-15', birthDateEstimated: true, weightKg: '72.5',
      mainClinicCode: 'dm', conditions: ['AF'], allergySummary: '', goalA1c: '7', goalSbp: '140', goalDbp: '90', goalLdl: '100', note: '',
    }
    expect(patientSchema(TODAY).parse(base)).toMatchObject({ prefix: 'นาย', firstName: 'สมมติ', lastName: 'ทดสอบ', weightKg: 72.5, mainClinicName: 'เบาหวาน' })
    expect(errs(patientSchema(TODAY).safeParse({ ...base, goalSbp: '135.5' })).goalSbp).toBe('กรอกเป็นจำนวนเต็ม')
  })

  it('needs a cancel reason', () => {
    expect(errs(cancelSchema.safeParse({ reason: '   ' })).reason).toBe('ระบุเหตุผลที่ยกเลิก')
  })
})
