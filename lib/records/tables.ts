import { adrs, drps, highAlertMonitoring, patients, techniqueAssessments, visits } from '@/lib/db/schema'
import type { RecordKind } from './schemas'

export const TABLES = {
  visit: visits,
  drp: drps,
  hal: highAlertMonitoring,
  adr: adrs,
  tech: techniqueAssessments,
  patient: patients,
} as const

export type CareTable = (typeof TABLES)[Exclude<RecordKind, 'patient'>]

export const isRecordKind = (v: unknown): v is RecordKind => typeof v === 'string' && v in TABLES
