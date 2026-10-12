'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined)
  const error = state?.error
  const errClass = error ? 'input err' : 'input'

  return (
    <form action={action} className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 className="h2">เข้าสู่ระบบ</h2>

      {(error ?? notice) && (
        <div className={`band ${error ? 'dan' : 'warn'}`} role="alert" style={{ alignItems: 'flex-start', fontSize: 14 }}>
          <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={{ marginTop: 1 }}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16v.01" />
          </svg>
          <span>{error ?? notice}</span>
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="uid">รหัสผู้ใช้ (pha_id)</label>
        <input
          id="uid"
          name="pha_id"
          className={errClass}
          defaultValue={state?.phaId}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="pw">รหัสผ่าน</label>
        <input id="pw" name="password" type="password" className={errClass} autoComplete="current-password" required />
      </div>

      <button type="submit" className="btn btn-pri" disabled={pending} style={{ width: '100%', minHeight: 48, fontSize: 16 }}>
        {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>

      <p className="muted sm" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <svg className="ic ic-sm" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8v.01" />
        </svg>
        ใช้บัญชีเดียวกับ PharmShift
      </p>
    </form>
  )
}
