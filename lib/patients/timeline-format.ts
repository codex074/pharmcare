import { naranjoCategory, NARANJO_CATEGORY } from '@/lib/calc/naranjo'
import { scoreTechnique, type AssessedStep } from '@/lib/calc/technique'
import { inRange } from '@/lib/calc/targets'
import * as C from '@/lib/codes'
import type { CareKind } from './queries'

// One line of title + detail + status chips per care record, for the timeline.
// `data` is the row as JSON (snake_case columns).

export type Chip = { label: string; tone: '' | 'ok' | 'bad' | 'warn' | 'info' | 'mute' }
export type TimelineText = { title: string; detail: string; status: Chip[] }

type Row = Record<string, unknown>
const label = <T extends Record<string, string>>(o: T, code: unknown) => (typeof code === 'string' && code in o ? o[code as keyof T] : String(code ?? ''))
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(' · ')
const num = (v: unknown) => (typeof v === 'number' ? v : null)

const OUTCOME_TONE: Record<string, Chip['tone']> = { pending: 'warn', resolved: 'ok', partial: 'warn', unresolved: 'bad' }
const ACCEPT_TONE: Record<string, Chip['tone']> = { not_needed: 'mute', pending: 'warn', accepted: 'ok', partial: 'warn', rejected: 'bad' }

export function formatTimeline(kind: CareKind, d: Row): TimelineText {
  switch (kind) {
    case 'visit': {
      const bp = num(d.sbp) != null ? `BP ${d.sbp}/${d.dbp ?? '–'}` : null
      const methods = Array.isArray(d.adherence_methods) ? d.adherence_methods.map((m) => label(C.ADHERENCE_METHOD, m)).join(' + ') : ''
      const adherence = num(d.adherence_pct) != null ? `ความร่วมมือ ${d.adherence_pct}%${methods ? ` (${methods})` : ''}` : null
      return {
        title: d.clinic_name ? `ติดตามโรคเรื้อรัง — คลินิก${d.clinic_name}` : 'ติดตามโรคเรื้อรัง',
        detail: join(
          num(d.a1c) != null && `HbA1c ${d.a1c}%`,
          bp,
          num(d.ldl) != null && `LDL ${d.ldl}`,
          num(d.fbs) != null && `FBS ${d.fbs}`,
          num(d.scr) != null && `SCr ${d.scr}`,
          adherence,
        ),
        status: [],
      }
    }
    case 'drp': {
      const category = label(C.DRP_CATEGORY, d.category).replace(/^\d /, '')
      return {
        title: `DRP — ${category}${d.ncc_merp ? ` · ระดับ ${d.ncc_merp}` : ''}`,
        detail: join(d.drug as string, d.detail as string, d.recommendation ? `เสนอ: ${d.recommendation}` : null),
        status: [
          { label: label(C.DRP_ACCEPTANCE, d.acceptance), tone: ACCEPT_TONE[d.acceptance as string] ?? 'mute' },
          { label: d.outcome === 'pending' ? 'รอผลลัพธ์' : label(C.DRP_OUTCOME, d.outcome), tone: OUTCOME_TONE[d.outcome as string] ?? 'mute' },
        ],
      }
    }
    case 'hal': {
      const drug = d.drug === 'other' ? (d.drug_other as string) || 'อื่น ๆ' : label(C.HIGH_ALERT_DRUG, d.drug)
      const value = num(d.value)
      const low = num(d.target_low)
      const high = num(d.target_high)
      const ok = value != null && low != null && high != null ? inRange(value, low, high) : null
      return {
        title: `ยาความเสี่ยงสูง — ${join(drug, d.dose as string)}`,
        detail: join(`${d.parameter} ${value} (เป้า ${low}–${high})`, Array.isArray(d.events) && d.events.length ? d.events.map((e) => label(C.HIGH_ALERT_EVENT, e)).join(', ') : null),
        status: [
          ...(ok == null ? [] : [ok ? { label: 'ในช่วงเป้า', tone: 'ok' } : { label: value! < low! ? 'ต่ำกว่าเป้า' : 'สูงกว่าเป้า', tone: 'bad' }]),
          { label: label(C.HIGH_ALERT_ACTION, d.action), tone: 'mute' },
        ] as Chip[],
      }
    }
    case 'adr': {
      const score = num(d.naranjo_score)
      return {
        title: `ADR — ${d.drug} (${d.reaction})`,
        detail: join(
          label(C.ADR_TYPE, d.type),
          label(C.ADR_SEVERITY, d.severity),
          score != null && `Naranjo ${score} คะแนน · ${NARANJO_CATEGORY[naranjoCategory(score)]}`,
        ),
        status: d.type === 'allergy' ? [{ label: 'บันทึกแพ้ยา', tone: 'bad' }] : [],
      }
    }
    case 'tech': {
      const steps = (Array.isArray(d.steps) ? d.steps : []) as AssessedStep[]
      const s = scoreTechnique(steps)
      return {
        title: `สอนเทคนิค — ${label(C.DEVICE, d.device)}`,
        detail: join(`ทำถูก ${s.passed}/${s.total} ขั้น (${s.pct}%)`, label(C.TECHNIQUE_PHASE, d.phase), d.advice as string),
        status: [s.criticalAllPassed ? { label: 'ขั้นสำคัญครบ', tone: 'ok' } : { label: 'ขั้นสำคัญยังไม่ครบ', tone: 'bad' }],
      }
    }
  }
}
