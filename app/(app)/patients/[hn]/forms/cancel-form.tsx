'use client'

import { useState, useTransition } from 'react'
import { Panel, Section, TextField } from '@/components/form-controls'
import { cancelSchema, formErrors, type FormErrors, type RecordKind } from '@/lib/records/schemas'
import { cancelRecord } from '../record-actions'
import type { FormBase } from './use-save'

// Cancelling never deletes: the record stays, struck through, with the reason.
export function CancelForm({ base, kind, title, summary }: { base: FormBase & { id: string }; kind: RecordKind; title: string; summary: string }) {
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<string>()
  const [pending, start] = useTransition()

  function submit() {
    const r = cancelSchema.safeParse({ reason })
    if (!r.success) return setErrors(formErrors(r.error))
    setErrors({})
    start(async () => {
      const res = await cancelRecord({ hn: base.hn, kind, id: base.id, reason, back: base.back })
      if (res) {
        setErrors(res.errors ?? {})
        setMessage(res.message)
      }
    })
  }

  return (
    <Panel
      title={`ยกเลิกรายการ: ${title}`}
      subtitle={base.patientLine}
      icon="alert"
      tone={{ background: 'var(--dan-bg)', color: 'var(--dan-tx)' }}
      closeHref={base.closeHref}
      saveLabel="ยืนยันยกเลิกรายการ"
      pending={pending}
      message={message}
      onSubmit={submit}
    >
      <Section title="รายการที่จะยกเลิก">
        <p style={{ fontWeight: 600 }}>{summary}</p>
        <p className="sm muted">รายการจะไม่ถูกลบ แต่จะไม่นำไปคิดในสถิติ และยังดูได้ในประวัติพร้อมเหตุผล ยกเลิกแล้วย้อนกลับไม่ได้</p>
        <TextField id="reason" label="เหตุผลที่ยกเลิก" multiline value={reason} onChange={setReason} error={errors.reason} />
      </Section>
    </Panel>
  )
}
