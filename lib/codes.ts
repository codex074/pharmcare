// Stable codes stored in the database, with their Thai labels.
// Logic (KPIs, the allergy band, checks) switches on codes, never on labels,
// so labels can be reworded without a migration. Adding a code needs a
// migration because lib/db/schema.ts turns these lists into CHECK constraints.

type Options = Record<string, string>
export const codesOf = <T extends Options>(o: T) => Object.keys(o) as (keyof T & string)[]

export const SEX = { male: 'ชาย', female: 'หญิง' } as const

// ---- Visit
export const ADHERENCE_METHOD = {
  pill_count: 'นับเม็ดยา',
  interview: 'สอบถามผู้ป่วย',
  leftover_check: 'ตรวจปากกา / ยาเหลือ',
  mmas8: 'แบบประเมิน MMAS-8',
} as const

export const MED_REC_STATUS = { match: 'ตรง', mismatch: 'ไม่ตรง' } as const

// ---- DRP
export const DRP_CATEGORY = {
  unnecessary_drug: '1 ได้รับยาที่ไม่จำเป็น',
  needs_drug: '2 ต้องการยาเพิ่ม',
  ineffective_drug: '3 ยาไม่มีประสิทธิผลหรือไม่เหมาะสม',
  dose_too_low: '4 ขนาดยาต่ำเกินไป',
  adverse_reaction: '5 เกิดอาการไม่พึงประสงค์',
  dose_too_high: '6 ขนาดยาสูงเกินไป',
  nonadherence: '7 ไม่ร่วมมือในการใช้ยา',
  interaction: '8 อันตรกิริยาระหว่างยา',
} as const

export const NCC_MERP = {
  A: 'A เหตุการณ์ที่อาจทำให้คลาดเคลื่อน',
  B: 'B คลาดเคลื่อนแต่ไม่ถึงผู้ป่วย',
  C: 'C ถึงผู้ป่วย ไม่เป็นอันตราย',
  D: 'D ต้องเฝ้าระวังเพิ่ม',
  E: 'E ต้องรักษาเพิ่ม',
  F: 'F ต้องนอนโรงพยาบาล',
  G: 'G พิการถาวร',
  H: 'H ต้องช่วยชีวิต',
  I: 'I เสียชีวิต',
} as const

export const DRP_INTERVENTION = {
  adjust_dose: 'ปรึกษาแพทย์เพื่อปรับขนาดยา',
  add_drug: 'ปรึกษาแพทย์เพื่อเพิ่มยา',
  stop_or_switch: 'ปรึกษาแพทย์เพื่อหยุดหรือเปลี่ยนยา',
  counsel: 'ให้คำแนะนำผู้ป่วย',
  technique: 'สอนเทคนิคการใช้ยา',
  administration: 'ปรับวิธีบริหารยา/จัดยา',
  lab_monitoring: 'ขอตรวจติดตามแล็บ',
  refer: 'ส่งต่อ',
} as const

// KPI: physician acceptance % counts only accepted / partial / rejected.
export const DRP_ACCEPTANCE = {
  not_needed: 'ไม่ต้องปรึกษาแพทย์',
  pending: 'รอคำตอบ',
  accepted: 'ยอมรับ',
  partial: 'ยอมรับบางส่วน',
  rejected: 'ไม่ยอมรับ',
} as const

// KPI: resolved % counts only closed DRPs (everything except pending).
export const DRP_OUTCOME = {
  pending: 'รอติดตาม',
  resolved: 'แก้ไขได้',
  partial: 'แก้ไขได้บางส่วน',
  unresolved: 'แก้ไขไม่ได้',
} as const

// ---- High-alert drug monitoring
export const HIGH_ALERT_DRUG = {
  warfarin: 'Warfarin',
  doac: 'DOAC',
  insulin: 'Insulin',
  methotrexate: 'Methotrexate',
  digoxin: 'Digoxin',
  lithium: 'Lithium',
  phenytoin: 'Phenytoin',
  amiodarone: 'Amiodarone',
  oral_chemo: 'ยาเคมีบำบัดชนิดรับประทาน',
  other: 'อื่น ๆ',
} as const

export const HIGH_ALERT_EVENT = {
  minor_bleed: 'เลือดออกเล็กน้อย',
  major_bleed: 'เลือดออกรุนแรง',
  thrombosis: 'ลิ่มเลือดอุดตัน',
  toxicity: 'อาการพิษจากยา',
} as const

export const HIGH_ALERT_FACTOR = {
  missed_or_wrong_dose: 'ลืมกินยา/กินยาผิด',
  drug_interaction: 'อันตรกิริยากับยาอื่น',
  herbal_supplement: 'สมุนไพร/อาหารเสริม',
  diet_change: 'อาหารเปลี่ยน',
  acute_illness: 'เจ็บป่วยเฉียบพลัน',
  alcohol: 'แอลกอฮอล์',
} as const

export const HIGH_ALERT_ACTION = {
  maintain: 'คงขนาดเดิม',
  increase: 'เพิ่มขนาด',
  decrease: 'ลดขนาด',
  hold: 'หยุดยาชั่วคราว',
  refer_now: 'ส่งพบแพทย์ทันที',
} as const

// ---- ADR / allergy
// `allergy` raises the red allergy band on the patient.
export const ADR_TYPE = {
  allergy: 'แพ้ยา (Type B)',
  side_effect: 'อาการข้างเคียง (Type A)',
  pseudoallergy: 'แพ้ยาเทียม (pseudoallergy)',
} as const

export const ADR_SEVERITY = { mild: 'ไม่รุนแรง', moderate: 'ปานกลาง', severe: 'รุนแรง' } as const

export const ADR_SERIOUSNESS = {
  not_serious: 'ไม่ร้ายแรง',
  hospitalization: 'ต้องนอนโรงพยาบาล',
  life_threatening: 'อันตรายถึงชีวิต',
  disability: 'พิการ',
  death: 'เสียชีวิต',
} as const

export const ADR_MANAGEMENT = {
  stop_drug: 'หยุดยา',
  reduce_dose: 'ลดขนาดยา',
  symptomatic_treatment: 'ให้ยารักษาอาการ',
  refer: 'ส่งพบแพทย์',
} as const

export const ADR_RESULT = {
  recovered: 'หายเป็นปกติ',
  improving: 'อาการดีขึ้น',
  not_recovered: 'ยังมีอาการ',
  recovered_with_sequelae: 'หายโดยมีร่องรอย',
} as const

export const ADR_ACTION = {
  allergy_card: 'ออกบัตรแพ้ยา',
  his_record: 'บันทึกในระบบโรงพยาบาล',
  hpvc_report: 'รายงาน HPVC',
  avoidance_advice: 'แนะนำยาที่ควรหลีกเลี่ยง',
} as const

// Naranjo answers, one per question in lib/calc (step 4).
export const NARANJO_ANSWER = { yes: 'ใช่', no: 'ไม่ใช่', unknown: 'ไม่ทราบ' } as const

// ---- Technique teaching (step lists per device live in lib/checklists.ts)
export const DEVICE = {
  pen: 'ปากกาอินซูลิน',
  syringe: 'อินซูลินขวด + กระบอกฉีด',
  mdi: 'ยาสูด MDI',
  spacer: 'ยาสูด MDI + spacer',
  accuhaler: 'Accuhaler (DPI)',
  turbuhaler: 'Turbuhaler (DPI)',
  respimat: 'Respimat (soft mist)',
  nasal: 'ยาพ่นจมูก',
} as const

export const TECHNIQUE_PHASE = {
  pre: 'ประเมินก่อนสอน',
  post: 'ประเมินหลังสอน (teach-back)',
  follow_up: 'ติดตามซ้ำ',
} as const

export const DRUG_USER = { self: 'ผู้ป่วยทำเอง', caregiver: 'ผู้ดูแล' } as const

export const STEP_RESULT = { pass: 'ถูก', fail: 'ไม่ถูก' } as const
