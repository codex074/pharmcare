import type { IconName } from '@/components/icons'
import type { CareKind } from '@/lib/patients/queries'

// The five care types: tiles, tabs, timeline chips. Colors follow board 04.
export const CARE_KINDS: Record<
  CareKind,
  { label: string; title: string; tile: string; tileSub: string; chip: string; icon: IconName; tone: React.CSSProperties }
> = {
  visit: {
    label: 'Visit',
    title: 'Visit ติดตามโรคเรื้อรัง',
    tile: 'ติดตามโรคเรื้อรัง',
    tileSub: 'Visit · แล็บ ความร่วมมือ SOAP',
    chip: '',
    icon: 'visit',
    tone: {},
  },
  drp: {
    label: 'DRP',
    title: 'ปัญหาจากการใช้ยา (DRP)',
    tile: 'ปัญหาจากการใช้ยา',
    tileSub: 'DRP · NCC MERP',
    chip: 'warn',
    icon: 'drp',
    tone: { background: 'var(--warn-bg)', color: 'var(--warn-tx)', borderColor: 'var(--warn-bd)' },
  },
  hal: {
    label: 'ยาเสี่ยงสูง',
    title: 'ยาความเสี่ยงสูง',
    tile: 'ยาความเสี่ยงสูง',
    tileSub: 'Warfarin · Insulin',
    chip: 'info',
    icon: 'hal',
    tone: { background: 'var(--info-bg)', color: 'var(--info)', borderColor: 'var(--info-bd)' },
  },
  adr: {
    label: 'ADR',
    title: 'ADR / แพ้ยา',
    tile: 'ADR / แพ้ยา',
    tileSub: 'อาการ + Naranjo',
    chip: 'bad',
    icon: 'adr',
    tone: { background: 'var(--dan-bg)', color: 'var(--dan-tx)', borderColor: 'var(--dan-bd)' },
  },
  tech: {
    label: 'สอนเทคนิค',
    title: 'สอนเทคนิคการใช้ยา',
    tile: 'สอนเทคนิคการใช้ยา',
    tileSub: 'ปากกาอินซูลิน · ยาสูด',
    chip: 'ok',
    icon: 'tech',
    tone: { background: 'var(--ok-bg)', color: 'var(--ok-tx)', borderColor: 'var(--ok-bd)' },
  },
}

export const CARE_ORDER: CareKind[] = ['visit', 'drp', 'hal', 'adr', 'tech']

export const isCareKind = (v: unknown): v is CareKind => typeof v === 'string' && v in CARE_KINDS
