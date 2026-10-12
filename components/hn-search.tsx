'use client'

import { useRef } from 'react'
import { Icon } from './icons'

// A plain GET form: a barcode scanner types the HN and presses Enter, which
// must work even before the page has hydrated. The scan button only focuses
// the field — hardware scanners act as keyboards (camera access is disabled).
export function HnSearch({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <form className="card hn-box" action="/patients" method="get" role="search">
      <label htmlFor="hn">
        <Icon name="search" size="lg" />
        <span className="sr-only">HN ผู้ป่วย</span>
        <input
          ref={input}
          id="hn"
          name="hn"
          inputMode="numeric"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="HN เช่น 6900001"
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'hn-err' : undefined}
          autoFocus
          required
        />
      </label>
      <button
        type="button"
        className="btn btn-ic"
        aria-label="สแกนบาร์โค้ด"
        title="ยิงบาร์โค้ดเข้าช่อง HN ได้เลย"
        style={{ width: 56, minHeight: 56, borderRadius: 12 }}
        onClick={() => input.current?.focus()}
      >
        <Icon name="scan" style={{ width: 24, height: 24 }} />
      </button>
      <button type="submit" className="btn btn-pri" style={{ minHeight: 56, padding: '0 26px', borderRadius: 12, fontSize: 16 }}>
        ค้นหา
        <span className="hide-sm" style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,.18)' }}>
          Enter
        </span>
      </button>
    </form>
  )
}
