'use client'

import { useState, useTransition } from 'react'
import { formErrors, SCHEMAS, type FormErrors, type RecordKind } from '@/lib/records/schemas'
import { bangkokDate } from '@/lib/thai-date'
import { saveRecord } from '../record-actions'

export type FormBase = {
  hn: string
  patientLine: string // "นายสมมติ ทดสอบ · HN 6900001"
  closeHref: string
  id?: string
  back: { tab?: string; clinic?: string }
}

const FIX_RED = 'ยังบันทึกไม่ได้ แก้ไขช่องที่มีข้อความสีแดงก่อน'

// Validates with the shared schema first (instant feedback), then saves on the
// server, which validates again and redirects back to the patient on success.
export function useSave(kind: RecordKind, base: FormBase) {
  const [pending, start] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<string>()

  function save(values: unknown) {
    const r = SCHEMAS[kind](bangkokDate()).safeParse(values)
    if (!r.success) {
      setErrors(formErrors(r.error))
      setMessage(FIX_RED)
      return
    }
    setErrors({})
    setMessage(undefined)
    start(async () => {
      const res = await saveRecord({ hn: base.hn, kind, id: base.id, values, back: base.back })
      if (res) {
        setErrors(res.errors ?? {})
        setMessage(res.message ?? (res.errors ? FIX_RED : undefined))
      }
    })
  }

  // Editing a field clears its error until the next save attempt.
  const clear = (key: string) => setErrors((e) => (key in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e))

  return { save, pending, errors, message, clear }
}
