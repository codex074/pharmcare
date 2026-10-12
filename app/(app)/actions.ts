'use server'

import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth/dal'
import { getTheme, THEME_COOKIE } from '@/lib/theme'

export async function toggleTheme() {
  await requireUser()
  const next = (await getTheme()) === 'dark' ? 'light' : 'dark'
  ;(await cookies()).set(THEME_COOKIE, next, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 400 * 24 * 60 * 60,
  })
}
