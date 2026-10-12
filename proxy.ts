import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import { needsRefresh, SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from '@/lib/auth/session'

// Optimistic check only: a valid JWT lets the request through and slides its
// expiry. Role / is_active against the database is requireUser()'s job.
export async function proxy(request: NextRequest) {
  const secret = env().SESSION_JWT_SECRET
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret)
  const { pathname } = request.nextUrl

  if (pathname === '/login') return NextResponse.next()

  if (!session) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const response = NextResponse.next()
  if (needsRefresh(session)) {
    const token = await signSession({ sub: session.sub, pha: session.pha, name: session.name }, secret)
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions())
  }
  return response
}

export const config = {
  // Public: health check (container + failover), static assets, the logo.
  matcher: ['/((?!api/health|_next/static|_next/image|favicon.ico|logo-utth.png).*)'],
}
