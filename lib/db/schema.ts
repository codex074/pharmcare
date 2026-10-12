import { sql, type SQL } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import * as C from '@/lib/codes'

// Drizzle owns the tables. Triggers, functions and GRANTs are hand-written in
// drizzle/*.sql — every new table needs its own GRANT migration for pharmcare_app.

const literals = (codes: readonly string[]) => sql.raw(codes.map((c) => `'${c}'`).join(', '))
const oneOf = (col: AnyPgColumn, o: Record<string, string>): SQL => sql`${col} in (${literals(C.codesOf(o))})`
const subsetOf = (col: AnyPgColumn, o: Record<string, string>): SQL =>
  sql`${col} <@ array[${literals(C.codesOf(o))}]::text[]`
const between = (col: AnyPgColumn, lo: number, hi: number): SQL => sql`${col} between ${sql.raw(String(lo))} and ${sql.raw(String(hi))}`
const num = (name: string, precision: number, scale: number) => numeric(name, { precision, scale, mode: 'number' })

// Shared by every clinical table. created_* / updated_* / cancelled_by are
// stamped by triggers from the app.user_id / app.user_name settings; the
// defaults only exist so inserts type-check without them.
const recordColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: uuid('created_by')
    .notNull()
    .default(sql`nullif(current_setting('app.user_id', true), '')::uuid`),
  createdByName: text('created_by_name')
    .notNull()
    .default(sql`nullif(current_setting('app.user_name', true), '')`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: uuid('cancelled_by'),
  cancelReason: text('cancel_reason'),
  isSample: boolean('is_sample').notNull().default(false),
}

type RecordCols = { cancelledAt: AnyPgColumn; cancelledBy: AnyPgColumn; cancelReason: AnyPgColumn }
const cancelConsistent = (name: string, t: RecordCols) =>
  check(
    `${name}_cancel_consistent`,
    sql`(${t.cancelledAt} is null and ${t.cancelledBy} is null and ${t.cancelReason} is null)
     or (${t.cancelledAt} is not null and ${t.cancelledBy} is not null and nullif(btrim(${t.cancelReason}), '') is not null)`,
  )

export const patients = pgTable(
  'patients',
  {
    ...recordColumns,
    hn: text('hn').notNull(),
    // From HIS (any pharmacist may sync these; everything else is owner-only)
    prefix: text('prefix'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    sex: text('sex'),
    birthDate: date('birth_date'),
    // true when only an age was typed in (HIS unavailable): birth_date is 1 Jan of the derived year
    birthDateEstimated: boolean('birth_date_estimated').notNull().default(false),
    hisSyncedAt: timestamp('his_synced_at', { withTimezone: true }),
    // Recorded by pharmacists
    weightKg: num('weight_kg', 4, 1),
    mainClinicCode: text('main_clinic_code'),
    mainClinicName: text('main_clinic_name'),
    conditions: text('conditions').array().notNull().default(sql`'{}'::text[]`),
    allergySummary: text('allergy_summary'),
    goalA1c: num('goal_a1c', 3, 1).notNull().default(7),
    goalSbp: smallint('goal_sbp').notNull().default(140),
    goalDbp: smallint('goal_dbp').notNull().default(90),
    goalLdl: smallint('goal_ldl').notNull().default(100),
    note: text('note'),
  },
  (t) => [
    // A cancelled (mistaken) registration must not block registering the HN again.
    uniqueIndex('patients_hn_active_uq').on(t.hn).where(sql`${t.cancelledAt} is null`),
    cancelConsistent('patients', t),
    check('patients_sex', oneOf(t.sex, C.SEX)),
    check('patients_weight', between(t.weightKg, 2, 300)),
    check('patients_goal_a1c', between(t.goalA1c, 5, 10)),
    check('patients_goal_sbp', between(t.goalSbp, 100, 180)),
    check('patients_goal_dbp', between(t.goalDbp, 60, 110)),
    check('patients_goal_ldl', between(t.goalLdl, 40, 190)),
  ],
)

const patientId = () =>
  uuid('patient_id')
    .notNull()
    .references(() => patients.id)

export const visits = pgTable(
  'visits',
  {
    ...recordColumns,
    patientId: patientId(),
    date: date('date').notNull(),
    clinicCode: text('clinic_code'),
    clinicName: text('clinic_name'),
    sbp: smallint('sbp'),
    dbp: smallint('dbp'),
    fbs: smallint('fbs'),
    a1c: num('a1c', 3, 1),
    ldl: smallint('ldl'),
    scr: num('scr', 4, 2),
    adherencePct: smallint('adherence_pct'),
    adherenceMethods: text('adherence_methods').array().notNull().default(sql`'{}'::text[]`),
    // [{ drug, ordered, actual, status: 'match' | 'mismatch' }]
    medRec: jsonb('med_rec').notNull(),
    soapS: text('soap_s'),
    soapO: text('soap_o'),
    soapA: text('soap_a'),
    soapP: text('soap_p'),
  },
  (t) => [
    index('visits_patient_date_idx').on(t.patientId, t.date),
    cancelConsistent('visits', t),
    check('visits_med_rec', sql`jsonb_typeof(${t.medRec}) = 'array' and jsonb_array_length(${t.medRec}) > 0`),
    check('visits_adherence_methods', subsetOf(t.adherenceMethods, C.ADHERENCE_METHOD)),
    check('visits_sbp', between(t.sbp, 50, 300)),
    check('visits_dbp', between(t.dbp, 30, 200)),
    check('visits_fbs', between(t.fbs, 20, 800)),
    check('visits_a1c', between(t.a1c, 3, 20)),
    check('visits_ldl', between(t.ldl, 10, 500)),
    check('visits_scr', between(t.scr, 0.1, 20)),
    check('visits_adherence', between(t.adherencePct, 0, 120)),
  ],
)

export const drps = pgTable(
  'drps',
  {
    ...recordColumns,
    patientId: patientId(),
    date: date('date').notNull(),
    drug: text('drug'),
    category: text('category').notNull(),
    nccMerp: text('ncc_merp'),
    detail: text('detail').notNull(),
    interventions: text('interventions').array().notNull(),
    recommendation: text('recommendation'), // ข้อเสนอต่อแพทย์
    acceptance: text('acceptance').notNull(),
    outcome: text('outcome').notNull().default('pending'),
    outcomeDate: date('outcome_date'),
    followUpNote: text('follow_up_note'),
  },
  (t) => [
    index('drps_patient_date_idx').on(t.patientId, t.date),
    index('drps_open_idx').on(t.outcome).where(sql`${t.cancelledAt} is null and ${t.outcome} = 'pending'`),
    cancelConsistent('drps', t),
    check('drps_category', oneOf(t.category, C.DRP_CATEGORY)),
    check('drps_ncc_merp', oneOf(t.nccMerp, C.NCC_MERP)),
    check('drps_interventions', sql`cardinality(${t.interventions}) > 0 and ${subsetOf(t.interventions, C.DRP_INTERVENTION)}`),
    check('drps_acceptance', oneOf(t.acceptance, C.DRP_ACCEPTANCE)),
    check('drps_outcome', oneOf(t.outcome, C.DRP_OUTCOME)),
  ],
)

export const highAlertMonitoring = pgTable(
  'high_alert_monitoring',
  {
    ...recordColumns,
    patientId: patientId(),
    date: date('date').notNull(),
    drug: text('drug').notNull(),
    drugOther: text('drug_other'), // name when drug = 'other'
    indication: text('indication'),
    parameter: text('parameter').notNull(), // e.g. INR
    value: num('value', 8, 2).notNull(),
    targetLow: num('target_low', 8, 2).notNull(),
    targetHigh: num('target_high', 8, 2).notNull(),
    dose: text('dose'),
    events: text('events').array().notNull().default(sql`'{}'::text[]`),
    factors: text('factors').array().notNull().default(sql`'{}'::text[]`),
    action: text('action').notNull(),
    plan: text('plan'),
  },
  (t) => [
    index('high_alert_patient_date_idx').on(t.patientId, t.date),
    cancelConsistent('high_alert_monitoring', t),
    check('high_alert_drug', oneOf(t.drug, C.HIGH_ALERT_DRUG)),
    check('high_alert_value', between(t.value, 0, 5000)),
    check('high_alert_target', sql`${t.targetLow} < ${t.targetHigh}`),
    check('high_alert_events', subsetOf(t.events, C.HIGH_ALERT_EVENT)),
    check('high_alert_factors', subsetOf(t.factors, C.HIGH_ALERT_FACTOR)),
    check('high_alert_action', oneOf(t.action, C.HIGH_ALERT_ACTION)),
  ],
)

export const adrs = pgTable(
  'adrs',
  {
    ...recordColumns,
    patientId: patientId(),
    date: date('date').notNull(), // วันที่เกิดอาการ
    drug: text('drug').notNull(),
    drugStartDate: date('drug_start_date'),
    reaction: text('reaction').notNull(),
    type: text('type').notNull(),
    severity: text('severity').notNull(),
    seriousness: text('seriousness'),
    // 10 answers, NARANJO_ANSWER codes, in question order
    naranjoAnswers: jsonb('naranjo_answers'),
    naranjoScore: smallint('naranjo_score'),
    management: text('management').array().notNull().default(sql`'{}'::text[]`),
    managementNote: text('management_note'),
    result: text('result'),
    actions: text('actions').array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [
    index('adrs_patient_date_idx').on(t.patientId, t.date),
    cancelConsistent('adrs', t),
    check('adrs_type', oneOf(t.type, C.ADR_TYPE)),
    check('adrs_severity', oneOf(t.severity, C.ADR_SEVERITY)),
    check('adrs_seriousness', oneOf(t.seriousness, C.ADR_SERIOUSNESS)),
    check('adrs_management', subsetOf(t.management, C.ADR_MANAGEMENT)),
    check('adrs_result', oneOf(t.result, C.ADR_RESULT)),
    check('adrs_actions', subsetOf(t.actions, C.ADR_ACTION)),
    check(
      'adrs_naranjo',
      sql`(${t.naranjoAnswers} is null and ${t.naranjoScore} is null)
       or (jsonb_typeof(${t.naranjoAnswers}) = 'array' and jsonb_array_length(${t.naranjoAnswers}) = 10
           and ${between(t.naranjoScore, -4, 13)})`,
    ),
    check('adrs_start_before_onset', sql`${t.drugStartDate} is null or ${t.drugStartDate} <= ${t.date}`),
  ],
)

export const techniqueAssessments = pgTable(
  'technique_assessments',
  {
    ...recordColumns,
    patientId: patientId(),
    date: date('date').notNull(),
    device: text('device').notNull(),
    drug: text('drug').notNull(),
    phase: text('phase').notNull(),
    drugUser: text('drug_user'),
    // Snapshot of the checklist as assessed, so later checklist edits don't
    // change history: [{ text, critical, result: 'pass' | 'fail' | null }]
    steps: jsonb('steps').notNull(),
    scorePct: smallint('score_pct').notNull(),
    criticalAllPassed: boolean('critical_all_passed').notNull(),
    education: text('education').array().notNull().default(sql`'{}'::text[]`),
    problem: text('problem'),
    advice: text('advice'), // ข้อแนะนำเพิ่มเติม
    aids: text('aids'),
  },
  (t) => [
    index('technique_patient_date_idx').on(t.patientId, t.date),
    cancelConsistent('technique_assessments', t),
    check('technique_device', oneOf(t.device, C.DEVICE)),
    check('technique_phase', oneOf(t.phase, C.TECHNIQUE_PHASE)),
    check('technique_drug_user', oneOf(t.drugUser, C.DRUG_USER)),
    check('technique_steps', sql`jsonb_typeof(${t.steps}) = 'array' and jsonb_array_length(${t.steps}) > 0`),
    check('technique_score', between(t.scorePct, 0, 100)),
  ],
)

// Written only by the SECURITY DEFINER audit trigger. pharmcare_app: SELECT only.
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    tableName: text('table_name').notNull(),
    recordId: uuid('record_id').notNull(),
    patientId: uuid('patient_id'),
    action: text('action').notNull(),
    actorId: uuid('actor_id').notNull(),
    actorName: text('actor_name').notNull(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    // insert: full row; update / cancel: { column: { from, to } }
    diff: jsonb('diff').notNull(),
  },
  (t) => [
    index('audit_log_patient_idx').on(t.patientId, t.at),
    index('audit_log_record_idx').on(t.tableName, t.recordId),
    index('audit_log_at_idx').on(t.at),
    check('audit_log_action', sql`${t.action} in ('insert', 'update', 'cancel')`),
  ],
)

// Failed logins only. pharmcare_app: SELECT, INSERT, plus EXECUTE on purge_login_attempts().
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaId: text('pha_id').notNull(),
    ip: text('ip').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('login_attempts_pha_id_idx').on(t.phaId, t.attemptedAt),
    index('login_attempts_ip_idx').on(t.ip, t.attemptedAt),
  ],
)
