'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { forgetUser } from '@/lib/auth/dal'
import { attemptLogin } from '@/lib/auth/login'
import { displayName } from '@/lib/auth/policy'
import { clientIp } from '@/lib/auth/rate-limit'
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session'
import { loginDeps } from '@/lib/auth/store'

export type LoginState = { error?: string; phaId?: string } | undefined

// Server actions get Next's built-in Origin check, which covers CSRF here.
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const phaId = formData.get('pha_id')
  const ip = clientIp(await headers())
  const result = await attemptLogin(phaId, formData.get('password'), ip, loginDeps)
  if (!result.ok) return { error: result.message, phaId: typeof phaId === 'string' ? phaId : '' }

  const { account } = result
  const token = await signSession(
    { sub: account.id, pha: account.pha_id, name: displayName(account) },
    env().SESSION_JWT_SECRET,
  )
  ;(await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions())
  forgetUser(account.id)
  redirect('/')
}

export async function logout() {
  ;(await cookies()).delete(SESSION_COOKIE)
  redirect('/login')
}
