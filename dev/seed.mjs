// Fictional sample patients for the dev database only (npm run db:seed).
// Writes through the same actor settings as the app, so triggers and audit run.
// Re-running skips HNs that already exist.
import postgres from 'postgres'

try {
  process.loadEnvFile('.env.local')
} catch {}

const DB = process.env.DATABASE_URL
const AUTH = process.env.AUTH_DATABASE_URL
for (const url of [DB, AUTH]) {
  const host = url ? new URL(url).hostname : ''
  if (!['127.0.0.1', 'localhost'].includes(host)) {
    console.error(`refusing to seed: ${host || 'no DATABASE_URL'} is not the local dev database`)
    process.exit(1)
  }
}

const sql = postgres(DB, { max: 1, onnotice: () => {} })
const auth = postgres(AUTH, { max: 1 })

const users = Object.fromEntries(
  (await auth`select id, pha_id, prefix, f_name, l_name from public.users where pha_id in ('dev_pharm', 'dev_pharm2')`).map((u) => [
    u.pha_id,
    { id: u.id, name: `${u.prefix ?? ''}${u.f_name} ${u.l_name}` },
  ]),
)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())

const as = (user, fn) =>
  sql.begin(async (tx) => {
    await tx`select set_config('app.user_id', ${user.id}, true), set_config('app.user_name', ${user.name}, true)`
    return fn(tx)
  })

async function patient(user, row) {
  const [exists] = await sql`select id from patients where hn = ${row.hn} and cancelled_at is null`
  if (exists) {
    console.log(`HN ${row.hn} exists, skipped`)
    return null
  }
  const [p] = await as(user, (tx) => tx`insert into patients ${tx({ ...row, is_sample: true })} returning id`)
  console.log(`HN ${row.hn} created`)
  return p.id
}

// One statement per row: rows have different columns.
const insert = (user, table, rows) =>
  as(user, async (tx) => {
    const ids = []
    for (const r of rows) ids.push(...(await tx`insert into ${tx(table)} ${tx({ ...r, is_sample: true })} returning id`))
    return ids
  })
const medRec = (...items) => items.map(([drug, ordered, actual]) => ({ drug, ordered, actual, status: ordered === actual ? 'match' : 'mismatch' }))
const step = (text, critical, result) => ({ text, critical, result })
const pen = (r) =>
  [
    ['ล้างมือ ตรวจชื่ออินซูลิน วันหมดอายุ และลักษณะน้ำยา', false],
    ['อินซูลินชนิดขุ่น (NPH/premixed): กลิ้งและคว่ำปากกาไปมาอย่างละ 10 ครั้งจนขุ่นสม่ำเสมอ', false],
    ['ใส่เข็มใหม่ทุกครั้ง แล้วถอดปลอกเข็มออก', false],
    ['ไล่อากาศ 2 ยูนิต จนเห็นหยดยาที่ปลายเข็ม', true],
    ['หมุนตั้งขนาดยาตรงตามที่แพทย์สั่ง', true],
    ['เลือกตำแหน่งฉีดถูกต้อง และหมุนเวียนห่างจากจุดเดิมอย่างน้อย 1 นิ้ว', false],
    ['ทำความสะอาดผิวหนัง รอให้แห้ง แทงเข็มตั้งฉากกับผิวหนัง', false],
    ['กดปุ่มฉีดจนสุด ตัวเลขกลับมาที่ 0', true],
    ['ค้างเข็มไว้นับ 1–10 (อย่างน้อย 10 วินาที) ก่อนถอนเข็ม', true],
    ['ถอดเข็มทิ้งในภาชนะทิ้งของมีคม ไม่เก็บปากกาโดยมีเข็มค้าง', false],
    ['เก็บรักษาถูกต้อง: ยังไม่เปิดใช้เก็บตู้เย็น 2–8°C ไม่แช่แข็ง ไม่วางที่ฝาตู้เย็น', false],
  ].map(([t, c], i) => step(t, c, r[i]))

const A = users.dev_pharm
const B = users.dev_pharm2

// HN 6900001 — diabetes clinic, several care types, one cancelled ADR
const p1 = await patient(A, {
  hn: '6900001',
  prefix: 'นาย',
  first_name: 'สมมติ',
  last_name: 'ทดสอบ',
  sex: 'male',
  birth_date: '1964-03-15',
  main_clinic_code: 'dm',
  main_clinic_name: 'เบาหวาน',
  conditions: ['เบาหวานชนิดที่ 2', 'ความดันโลหิตสูง', 'ไขมันในเลือดสูง'],
  weight_kg: 72.5,
})
if (p1) {
  const meds = medRec(['Metformin 500 mg', '2×2 pc', '2×2 pc'], ['Insulin glargine 18 u hs', '18 u', '16 u'], ['Simvastatin 20 mg', '1 hs', '1 hs'])
  await insert(A, 'visits', [
    { patient_id: p1, date: '2025-10-14', clinic_code: 'dm', clinic_name: 'เบาหวาน', a1c: 8.9, sbp: 142, dbp: 86, ldl: 118, scr: 1.0, adherence_pct: 60, adherence_methods: ['pill_count'], med_rec: meds },
    { patient_id: p1, date: '2026-01-13', clinic_code: 'dm', clinic_name: 'เบาหวาน', a1c: 8.4, sbp: 136, dbp: 84, ldl: 104, adherence_pct: 70, adherence_methods: ['pill_count'], med_rec: meds },
    { patient_id: p1, date: '2026-04-20', clinic_code: 'dm', clinic_name: 'เบาหวาน', a1c: 8.1, sbp: 134, dbp: 82, adherence_pct: 70, adherence_methods: ['pill_count'], med_rec: meds },
    { patient_id: p1, date: '2026-07-13', clinic_code: 'dm', clinic_name: 'เบาหวาน', a1c: 7.6, sbp: 130, dbp: 80, ldl: 96, scr: 1.1, adherence_pct: 80, adherence_methods: ['interview'], med_rec: meds },
    { patient_id: p1, date: today, clinic_code: 'dm', clinic_name: 'เบาหวาน', a1c: 7.8, sbp: 128, dbp: 78, ldl: 92, adherence_pct: 85, adherence_methods: ['leftover_check', 'interview'], med_rec: meds, soap_a: 'ควบคุมน้ำตาลยังไม่ถึงเป้า สาเหตุหลักจากใช้ขนาดยาต่ำกว่าที่สั่ง' },
  ])
  await insert(A, 'drps', [
    { patient_id: p1, date: '2026-07-13', drug: 'Insulin glargine', category: 'nonadherence', ncc_merp: 'C', detail: 'ลืมฉีดอินซูลินมื้อเย็น 3–4 ครั้ง/สัปดาห์', interventions: ['counsel'], acceptance: 'not_needed', outcome: 'pending' },
    { patient_id: p1, date: today, drug: 'Insulin glargine', category: 'dose_too_low', ncc_merp: 'D', detail: 'ฉีดจริง 16 u (แพทย์สั่ง 18 u) · FBS 142', interventions: ['technique', 'adjust_dose'], recommendation: 'คงขนาด 18 u และทวนเทคนิคการหมุนขนาดยา', acceptance: 'accepted', outcome: 'pending' },
    { patient_id: p1, date: '2026-04-20', drug: 'Simvastatin 40 mg + Amlodipine 10 mg', category: 'interaction', ncc_merp: 'C', detail: 'เสนอลด Simvastatin เป็น 20 mg', interventions: ['adjust_dose'], acceptance: 'accepted', outcome: 'resolved', outcome_date: '2026-07-13' },
  ])
  await insert(A, 'technique_assessments', [
    { patient_id: p1, date: '2026-07-13', device: 'pen', drug: 'Insulin glargine', phase: 'pre', steps: pen(['pass', 'pass', 'pass', 'pass', 'fail', 'pass', 'pass', 'pass', 'fail', 'fail', 'fail']), score_pct: 64, critical_all_passed: false },
    { patient_id: p1, date: today, device: 'pen', drug: 'Insulin glargine', phase: 'follow_up', steps: pen(['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'fail', 'pass', 'fail']), score_pct: 82, critical_all_passed: false, advice: 'ทวนขั้นค้างเข็ม 10 วินาที ให้ผู้ป่วยนับ 1–10 ในใจก่อนดึงเข็ม' },
  ])
  const naranjo = (score, answers) => ({ naranjo_answers: answers, naranjo_score: score })
  await insert(B, 'adrs', [
    { patient_id: p1, date: '2026-01-15', drug: 'Amoxicillin', reaction: 'ผื่นแดงคันทั้งตัว', type: 'allergy', severity: 'moderate', actions: ['allergy_card', 'his_record'], ...naranjo(6, ['yes', 'yes', 'yes', 'unknown', 'no', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown']) },
  ])
  const [wrong] = await insert(B, 'adrs', [
    { patient_id: p1, date: '2026-07-13', drug: 'Metformin', reaction: 'คลื่นไส้', type: 'side_effect', severity: 'mild', ...naranjo(3, ['yes', 'yes', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown']) },
  ])
  await as(B, (tx) => tx`update adrs set cancelled_at = now(), cancel_reason = 'บันทึกผิดผู้ป่วย (ย้ายไป HN 6900044)' where id = ${wrong.id}`)
}

// HN 6900002 — the prototype's warfarin example (TTR 58%, eGFR 59)
const p2 = await patient(B, {
  hn: '6900002',
  prefix: 'นาย',
  first_name: 'ตัวอย่าง',
  last_name: 'ขอบคุณ',
  sex: 'male',
  birth_date: '1955-11-02',
  main_clinic_code: 'wf',
  main_clinic_name: 'วาร์ฟาริน',
  conditions: ['AF', 'ความดันโลหิตสูง'],
  weight_kg: 61,
})
if (p2) {
  await insert(B, 'visits', [
    {
      patient_id: p2,
      date: '2026-10-05',
      clinic_code: 'wf',
      clinic_name: 'วาร์ฟาริน',
      sbp: 128,
      dbp: 76,
      scr: 1.3,
      adherence_pct: 100,
      adherence_methods: ['pill_count'],
      med_rec: medRec(['Warfarin 3 mg', '1×1 hs', '1×1 hs'], ['Bisoprolol 2.5 mg', '1×1', '1×1'], ['Amlodipine 5 mg', '1×1', '1×1']),
      soap_a: 'INR อยู่ในเป้า ไม่มีเลือดออก',
    },
  ])
  const inr = (date, value, action, extra = {}) => ({ patient_id: p2, date, drug: 'warfarin', indication: 'AF', parameter: 'INR', value, target_low: 2, target_high: 3, dose: '21 มก./สัปดาห์', action, ...extra })
  await insert(B, 'high_alert_monitoring', [
    inr('2026-06-01', 1.6, 'increase', { dose: '17.5 มก./สัปดาห์', factors: ['missed_or_wrong_dose'] }),
    inr('2026-06-29', 2.1, 'maintain'),
    inr('2026-07-27', 2.6, 'maintain'),
    inr('2026-08-24', 3.8, 'hold', { events: ['minor_bleed'], factors: ['drug_interaction'] }),
    inr('2026-09-07', 2.9, 'maintain'),
    inr('2026-10-05', 2.4, 'maintain'),
  ])
}

await Promise.all([sql.end(), auth.end()])
