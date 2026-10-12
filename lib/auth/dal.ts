import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { env } from '@/lib/env'
import { initials } from '@/lib/patients/name'
import { accessDenial, displayName } from './policy'
import { SESSION_COOKIE, verifySession } from './session'
import { findAccountById } from './store'

export type CurrentUser = {
  id: string
  phaId: string
  name: string // ภญ.สมใจ รักษ์ยา
  shortName: string // ภญ.สมใจ
  initials: string // สร
  role: string
}

// Role / is_active are re-read from PharmShift at most every 5 minutes per user,
// so revoking someone there locks them out of PharmCare within 5 minutes.
const RECHECK_MS = 5 * 60 * 1000
const accountCache = new Map<string, { user: CurrentUser | null; at: number }>()

async function loadUser(id: string): Promise<CurrentUser | null> {
  const hit = accountCache.get(id)
  if (hit && Date.now() - hit.at < RECHECK_MS) return hit.user

  const account = await findAccountById(id)
  const user =
    account && !accessDenial(account)
      ? {
          id: account.id,
          phaId: account.pha_id,
          name: displayName(account),
          shortName: `${account.prefix ?? ''}${account.f_name}`,
          initials: initials(account.f_name, account.l_name),
          role: account.role,
        }
      : null
  accountCache.set(id, { user, at: Date.now() })
  return user
}

export function forgetUser(id: string) {
  accountCache.delete(id)
}

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return verifySession(token, env().SESSION_JWT_SECRET)
})

export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession()
  return session ? loadUser(session.sub) : null
})

// Call at the top of every page, server action and route handler that touches data.
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSession()
  if (!session) redirect('/login')
  const user = await loadUser(session.sub)
  if (!user) redirect('/login?revoked=1')
  return user
}
