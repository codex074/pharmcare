'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from './icons'

// Building blocks for the care forms (boards 07–10). All inputs are controlled:
// React resets uncontrolled fields after an action, which would lose input.

export function Panel({
  title,
  subtitle,
  icon,
  tone,
  closeHref,
  saveLabel,
  pending,
  message,
  onSubmit,
  footerExtra,
  children,
}: {
  title: string
  subtitle: React.ReactNode
  icon: IconName
  tone: React.CSSProperties
  closeHref: string
  saveLabel: string
  pending: boolean
  message?: string
  onSubmit: () => void
  footerExtra?: React.ReactNode
  children: React.ReactNode
}) {
  const router = useRouter()
  const body = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    body.current?.querySelector<HTMLElement>('input:not([type=hidden]), textarea, button.opt, [role=radio]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.replace(closeHref, { scroll: false })
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [closeHref, router])

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <Link className="scrim" href={closeHref} aria-label="ปิด" scroll={false} replace />
      <form
        ref={body}
        className="sheet-body panel"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!pending) onSubmit()
        }}
      >
        <div className="panel-hd">
          <span className="care-ic" style={tone}>
            <Icon name={icon} />
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <h2 className="h2">{title}</h2>
            <span className="muted xs">{subtitle}</span>
          </div>
          <Link className="btn btn-ic btn-sm" href={closeHref} aria-label="ปิดแผง" style={{ width: 40 }} scroll={false} replace>
            <Icon name="close" />
          </Link>
        </div>
        {message && (
          <div className="sec" style={{ paddingBottom: 0, borderBottom: 0 }}>
            <div className="band dan" role="alert">
              <Icon name="alert" />
              <span>{message}</span>
            </div>
          </div>
        )}
        {children}
        <div style={{ flex: 1 }} />
        <div className="panel-ft" style={{ position: 'sticky', bottom: 0 }}>
          {footerExtra}
          <Link className="btn" href={closeHref} scroll={false} replace>
            ยกเลิก
          </Link>
          <button type="submit" className="btn btn-pri" disabled={pending} style={{ flex: 1, maxWidth: 220 }}>
            {pending ? 'กำลังบันทึก…' : saveLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export function Section({ n, title, aside, children, style }: { n?: number; title: string; aside?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="sec" style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span className="sec-t">
          {n != null && <span className="step-n">{n}</span>}
          {title}
        </span>
        {aside}
      </div>
      {children}
    </div>
  )
}

export function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <span id={`${id}-err`} className="err-tx" role="alert">
      {msg}
    </span>
  ) : null
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  multiline,
  placeholder,
  type = 'text',
  inputMode,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  multiline?: boolean
  placeholder?: string
  type?: 'text' | 'date'
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  const common = {
    id,
    value,
    placeholder,
    className: `input${error ? ' err' : ''}`,
    'aria-invalid': !!error,
    'aria-describedby': error ? `${id}-err` : undefined,
  }
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...common} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} />
      )}
      <Err id={id} msg={error} />
    </div>
  )
}

export function UnitField({
  id,
  label,
  unit,
  value,
  onChange,
  error,
  decimal,
  warn,
}: {
  id: string
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  error?: string
  decimal?: boolean
  warn?: boolean
}) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="unit" style={error || warn ? { borderColor: 'var(--dan-bd)' } : undefined}>
        <input
          id={id}
          value={value}
          inputMode={decimal ? 'decimal' : 'numeric'}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && <span>{unit}</span>}
      </div>
      <Err id={id} msg={error} />
    </div>
  )
}

// Single choice as a segmented control (few short options).
export function Seg({ label, options, value, onChange, error, id }: { id: string; label: string; options: Record<string, string>; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="field">
      <span className="label" id={`${id}-l`}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={`${id}-l`} style={{ display: 'flex' }}>
        {Object.entries(options).map(([code, text]) => (
          <button key={code} type="button" role="radio" aria-checked={value === code} className={value === code ? 'on' : ''} style={{ flex: 1 }} onClick={() => onChange(value === code ? '' : code)}>
            {text}
          </button>
        ))}
      </div>
      <Err id={id} msg={error} />
    </div>
  )
}

// Single choice as option tiles with a radio dot.
export function Choice({
  id,
  options,
  value,
  onChange,
  error,
  columns = 2,
  label,
}: {
  id: string
  options: Record<string, React.ReactNode>
  value: string
  onChange: (v: string) => void
  error?: string
  columns?: number
  label: string
}) {
  return (
    <div className="field">
      <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8 }}>
        {Object.entries(options).map(([code, text]) => (
          <button key={code} type="button" role="radio" aria-checked={value === code} className={`opt${value === code ? ' on' : ''}`} style={{ fontSize: 14 }} onClick={() => onChange(code)}>
            <span className="radio" />
            <span style={{ minWidth: 0 }}>{text}</span>
          </button>
        ))}
      </div>
      <Err id={id} msg={error} />
    </div>
  )
}

// Multiple choice as toggle chips.
export function Multi({ id, label, options, value, onChange, error }: { id: string; label?: string; options: Record<string, string>; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(options).map(([code, text]) => {
          const on = value.includes(code)
          return (
            <button
              key={code}
              type="button"
              className={`opt${on ? ' on' : ''}`}
              aria-pressed={on}
              style={{ minHeight: 40, fontSize: 14 }}
              onClick={() => onChange(on ? value.filter((v) => v !== code) : [...value, code])}
            >
              {on && <Icon name="check" size="sm" />}
              {text}
            </button>
          )
        })}
      </div>
      <Err id={id} msg={error} />
    </div>
  )
}
