import { SignJWT, jwtVerify } from 'jose'

// Pure JWT helpers, shared by proxy.ts and the server-side DAL.

export const SESSION_COOKIE = 'pharmcare_session'
export const SESSION_TTL_SECONDS = 12 * 60 * 60
// Sliding expiry: the proxy re-issues the cookie once the token is this old.
export const SESSION_REFRESH_AFTER_SECONDS = 10 * 60

export type SessionClaims = {
  sub: string // PharmShift users.id
  pha: string // pha_id
  name: string // display name at login, for headers; authority comes from requireUser()
}

export type Session = SessionClaims & { iat: number; exp: number }

function key(secret: string) {
  return new TextEncoder().encode(secret)
}

export async function signSession(claims: SessionClaims, secret: string, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000)
  return new SignJWT({ pha: claims.pha, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(key(secret))
}

export async function verifySession(token: string | undefined, secret: string, now = Date.now()): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key(secret), {
      algorithms: ['HS256'],
      currentDate: new Date(now),
    })
    if (typeof payload.sub !== 'string' || typeof payload.pha !== 'string' || typeof payload.name !== 'string') return null
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null
    return { sub: payload.sub, pha: payload.pha, name: payload.name, iat: payload.iat, exp: payload.exp }
  } catch {
    return null
  }
}

export function needsRefresh(session: Session, now = Date.now()): boolean {
  return Math.floor(now / 1000) - session.iat >= SESSION_REFRESH_AFTER_SECONDS
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}
