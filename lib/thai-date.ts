// Thai dates with the Buddhist year, in the hospital's time zone.
// Hand-rolled because Intl's th-TH full date inserts "พ.ศ.", which the design omits.

export const TZ = 'Asia/Bangkok'

const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// 'YYYY-MM-DD' of `at` in Bangkok.
export function bangkokDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(at)
}

// 'HH:MM' of `at` in Bangkok.
export function bangkokTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
}

function split(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }
}

// วันจันทร์ที่ 12 ตุลาคม 2569
export function thaiDateLong(date: string): string {
  const { y, m, d, weekday } = split(date)
  return `วัน${WEEKDAYS[weekday]}ที่ ${d} ${MONTHS[m - 1]} ${y + 543}`
}

// 12 ต.ค. 2569
export function thaiDateShort(date: string): string {
  const { y, m, d } = split(date)
  return `${d} ${MONTHS_SHORT[m - 1]} ${y + 543}`
}

// ต.ค. 69 — chart axes
export function thaiMonthYear(date: string): string {
  const { y, m } = split(date)
  return `${MONTHS_SHORT[m - 1]} ${String(y + 543).slice(-2)}`
}
