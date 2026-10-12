import { describe, expect, it, vi } from 'vitest'
import { HIS_TIMEOUT_MS, lookupHn, NoopLookup, type PatientLookup } from '@/lib/his'
import { bangkokDate, bangkokTime, thaiDateLong, thaiDateShort, thaiMonthYear } from '@/lib/thai-date'
import { hnError, normalizeHn } from './hn'
import { fullName, initials, parseFullName } from './name'
import { birthDateFromAge, fieldErrors, registerSchema } from './register-schema'

describe('thai dates', () => {
  it('formats like the design', () => {
    expect(thaiDateLong('2026-10-12')).toBe('วันจันทร์ที่ 12 ตุลาคม 2569')
    expect(thaiDateShort('2026-01-05')).toBe('5 ม.ค. 2569')
    expect(thaiMonthYear('2025-10-01')).toBe('ต.ค. 68')
  })

  it('uses Bangkok time, not the server time zone', () => {
    const lateUtc = new Date('2026-10-11T18:30:00Z') // 01:30 on the 12th in Bangkok
    expect(bangkokDate(lateUtc)).toBe('2026-10-12')
    expect(bangkokTime(lateUtc)).toBe('01:30')
  })
})

describe('HN', () => {
  it('keeps leading zeros and drops whitespace', () => {
    expect(normalizeHn(' 0069 00001\n')).toBe('006900001')
    expect(normalizeHn(undefined)).toBe('')
  })

  it('rejects empty and odd characters', () => {
    expect(hnError('')).toBe('กรอก HN')
    expect(hnError('69/0001')).toMatch(/HN ใช้ได้เฉพาะ/)
    expect(hnError('6900001')).toBeNull()
  })
})

describe('names', () => {
  it('matches the longest prefix first', () => {
    expect(parseFullName('นางสาวตัวอย่าง ใจดี')).toEqual({ prefix: 'นางสาว', firstName: 'ตัวอย่าง', lastName: 'ใจดี' })
    expect(parseFullName('นาง ข้อมูล สมมุติ')).toEqual({ prefix: 'นาง', firstName: 'ข้อมูล', lastName: 'สมมุติ' })
    expect(parseFullName('ด.ช.ทดสอบ  ระบบ ดี')).toEqual({ prefix: 'ด.ช.', firstName: 'ทดสอบ', lastName: 'ระบบ ดี' })
  })

  it('works without a prefix and needs a surname', () => {
    expect(parseFullName('สมมติ ทดสอบ')).toEqual({ prefix: null, firstName: 'สมมติ', lastName: 'ทดสอบ' })
    expect(parseFullName('นายสมมติ')).toBeNull()
  })

  it('formats and abbreviates', () => {
    expect(fullName({ prefix: 'นาย', firstName: 'สมมติ', lastName: 'ทดสอบ' })).toBe('นายสมมติ ทดสอบ')
    expect(initials('สมมติ', 'ทดสอบ')).toBe('สท')
    expect(initials('เกศินี', 'ใจดี')).toBe('กจ')
  })
})

describe('registerSchema', () => {
  const ok = { hn: ' 6900002 ', fullName: 'นางทดลอง ข้อมูลใหม่', sex: 'female', age: '57', clinic: 'dm', allergy: '' }

  it('parses a complete form', () => {
    const r = registerSchema.safeParse(ok)
    expect(r.success && r.data).toEqual({ hn: '6900002', fullName: 'นางทดลอง ข้อมูลใหม่', sex: 'female', age: 57, clinic: 'dm', allergy: null })
  })

  it('leaves age and clinic optional but sex required (no silent default)', () => {
    const r = registerSchema.safeParse({ ...ok, age: '', clinic: '', sex: undefined })
    expect(r.success).toBe(false)
    expect(fieldErrors(r.error!)).toEqual({ sex: 'เลือกเพศ' })
  })

  it('reports each bad field once, in Thai', () => {
    const r = registerSchema.safeParse({ ...ok, hn: '', fullName: 'นายสมมติ', age: '7.5', clinic: 'nope' })
    const errs = fieldErrors(r.error!)
    expect(errs.hn).toBe('กรอก HN')
    expect(errs.fullName).toMatch(/นามสกุล/)
    expect(errs.age).toMatch(/จำนวนเต็ม/)
    expect(errs.clinic).toBeDefined()
  })

  it('turns an age into 1 January of the derived year', () => {
    expect(birthDateFromAge(57, '2026-10-12')).toBe('1969-01-01')
  })
})

describe('HIS lookup', () => {
  it('reports not_configured without a relay', async () => {
    expect(await lookupHn('6900001', new NoopLookup())).toEqual({ status: 'not_configured' })
  })

  it('turns errors into unavailable', async () => {
    const failing: PatientLookup = { lookup: async () => Promise.reject(new Error('ECONNREFUSED')) }
    expect(await lookupHn('1', failing)).toEqual({ status: 'unavailable', reason: 'ECONNREFUSED' })
  })

  it(`gives up after ${HIS_TIMEOUT_MS} ms and aborts the request`, async () => {
    vi.useFakeTimers()
    let aborted = false
    const slow: PatientLookup = {
      lookup: (_hn, signal) =>
        new Promise(() => {
          signal.addEventListener('abort', () => (aborted = true))
        }),
    }
    const pending = lookupHn('1', slow)
    await vi.advanceTimersByTimeAsync(HIS_TIMEOUT_MS)
    expect(await pending).toEqual({ status: 'unavailable', reason: 'timeout' })
    expect(aborted).toBe(true)
    vi.useRealTimers()
  })
})
