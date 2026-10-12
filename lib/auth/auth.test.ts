import bcrypt from 'bcryptjs'
import { describe, expect, it, vi } from 'vitest'
import { attemptLogin, BAD_CREDENTIALS_MESSAGE, normalizePhaId, type LoginDeps } from './login'
import { verifyPassword } from './password'
import { accessDenial, DENIAL_MESSAGE, displayName, type AccountRow } from './policy'
import { clientIp, isRateLimited, RATE_LIMIT_MESSAGE } from './rate-limit'
import { needsRefresh, SESSION_REFRESH_AFTER_SECONDS, SESSION_TTL_SECONDS, signSession, verifySession } from './session'

const SECRET = 'test-secret-that-is-at-least-32-characters'
const HASH = bcrypt.hashSync('right-pass', 4)

const pharmacist: AccountRow & { password: string | null } = {
  id: '00000000-0000-4000-8000-000000000001',
  pha_id: 'dev_pharm',
  prefix: 'ภญ.',
  f_name: 'สมใจ',
  l_name: 'รักษ์ยา',
  role: 'pharmacist',
  is_active: true,
  must_change_password: false,
  password: HASH,
}

function deps(account: typeof pharmacist | null, counts = { byUser: 0, byIp: 0 }) {
  return {
    findAccount: vi.fn(async () => account),
    countFailures: vi.fn(async () => counts),
    recordFailure: vi.fn(async () => {}),
  } satisfies LoginDeps
}

describe('verifyPassword', () => {
  it('checks bcrypt hashes', async () => {
    expect(await verifyPassword('right-pass', HASH)).toBe(true)
    expect(await verifyPassword('wrong', HASH)).toBe(false)
  })
  it('compares legacy plaintext and rejects empty stored values', async () => {
    expect(await verifyPassword('abc', 'abc')).toBe(true)
    expect(await verifyPassword('abc', null)).toBe(false)
  })
})

describe('accessDenial', () => {
  it('allows active pharmacists and admins', () => {
    expect(accessDenial(pharmacist)).toBeNull()
    expect(accessDenial({ ...pharmacist, role: 'admin' })).toBeNull()
  })
  it.each([
    [{ role: 'pharmacy_technician' }, 'not_pharmacist'],
    [{ role: 'officer' }, 'not_pharmacist'],
    [{ is_active: false }, 'inactive'],
    [{ must_change_password: true }, 'must_change_password'],
  ] as const)('denies %o', (patch, denial) => {
    expect(accessDenial({ ...pharmacist, ...patch })).toBe(denial)
  })
})

describe('attemptLogin', () => {
  it('normalizes pha_id before lookup', async () => {
    const d = deps(pharmacist)
    const r = await attemptLogin('  DEV_Pharm ', 'right-pass', '1.1.1.1', d)
    expect(r.ok).toBe(true)
    expect(d.findAccount).toHaveBeenCalledWith('dev_pharm')
    expect(normalizePhaId(42)).toBe('')
  })

  it('never returns the password hash', async () => {
    const r = await attemptLogin('dev_pharm', 'right-pass', 'ip', deps(pharmacist))
    expect(r.ok && 'password' in r.account).toBe(false)
  })

  it('records a failure for wrong password and unknown user, with the same message', async () => {
    const wrong = deps(pharmacist)
    const unknown = deps(null)
    const a = await attemptLogin('dev_pharm', 'nope', 'ip', wrong)
    const b = await attemptLogin('ghost', 'nope', 'ip', unknown)
    expect(a).toEqual({ ok: false, reason: 'bad_credentials', message: BAD_CREDENTIALS_MESSAGE })
    expect(b).toEqual(a)
    expect(wrong.recordFailure).toHaveBeenCalledWith('dev_pharm', 'ip')
    expect(unknown.recordFailure).toHaveBeenCalledWith('ghost', 'ip')
  })

  it('rate-limits before checking the password', async () => {
    const d = deps(pharmacist, { byUser: 5, byIp: 0 })
    const r = await attemptLogin('dev_pharm', 'right-pass', 'ip', d)
    expect(r).toMatchObject({ ok: false, reason: 'rate_limited', message: RATE_LIMIT_MESSAGE })
    expect(d.findAccount).not.toHaveBeenCalled()
  })

  it('hides account state from someone without the password', async () => {
    const r = await attemptLogin('dev_pharm', 'nope', 'ip', deps({ ...pharmacist, role: 'officer' }))
    expect(r).toMatchObject({ reason: 'bad_credentials' })
  })

  it('denies technicians, inactive, must-change and plaintext accounts after a correct password', async () => {
    const tech = await attemptLogin('x', 'right-pass', 'ip', deps({ ...pharmacist, role: 'pharmacy_technician' }))
    const inactive = await attemptLogin('x', 'right-pass', 'ip', deps({ ...pharmacist, is_active: false }))
    const change = await attemptLogin('x', 'right-pass', 'ip', deps({ ...pharmacist, must_change_password: true }))
    const plain = await attemptLogin('x', 'right-pass', 'ip', deps({ ...pharmacist, password: 'right-pass' }))
    expect(tech).toMatchObject({ reason: 'denied', message: DENIAL_MESSAGE.not_pharmacist })
    expect(inactive).toMatchObject({ reason: 'denied', message: DENIAL_MESSAGE.inactive })
    expect(change).toMatchObject({ reason: 'denied', message: DENIAL_MESSAGE.must_change_password })
    expect(plain).toMatchObject({ reason: 'denied', message: DENIAL_MESSAGE.must_change_password })
  })

  it('rejects empty input without touching the database', async () => {
    const d = deps(pharmacist)
    expect(await attemptLogin('', 'x', 'ip', d)).toMatchObject({ reason: 'invalid' })
    expect(d.countFailures).not.toHaveBeenCalled()
  })
})

describe('rate limit + IP', () => {
  it('limits at 5 per user or 30 per IP', () => {
    expect(isRateLimited({ byUser: 4, byIp: 29 })).toBe(false)
    expect(isRateLimited({ byUser: 5, byIp: 0 })).toBe(true)
    expect(isRateLimited({ byUser: 0, byIp: 30 })).toBe(true)
  })
  it('trusts only CF-Connecting-IP', () => {
    expect(clientIp(new Headers({ 'cf-connecting-ip': ' 203.0.113.9 ' }))).toBe('203.0.113.9')
    expect(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6' }))).toBe('local')
  })
})

describe('session JWT', () => {
  const claims = { sub: pharmacist.id, pha: 'dev_pharm', name: displayName(pharmacist) }

  it('round-trips claims', async () => {
    const now = Date.UTC(2026, 9, 12, 8)
    const s = await verifySession(await signSession(claims, SECRET, now), SECRET, now)
    expect(s).toMatchObject(claims)
    expect(s!.exp - s!.iat).toBe(SESSION_TTL_SECONDS)
  })

  it('rejects a wrong secret, an expired token and garbage', async () => {
    const now = Date.UTC(2026, 9, 12, 8)
    const token = await signSession(claims, SECRET, now)
    expect(await verifySession(token, 'another-secret-that-is-at-least-32-chars', now)).toBeNull()
    expect(await verifySession(token, SECRET, now + (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
    expect(await verifySession('not.a.jwt', SECRET, now)).toBeNull()
    expect(await verifySession(undefined, SECRET, now)).toBeNull()
  })

  it('slides once the token is 10 minutes old', async () => {
    const now = Date.UTC(2026, 9, 12, 8)
    const s = (await verifySession(await signSession(claims, SECRET, now), SECRET, now))!
    expect(needsRefresh(s, now + 60_000)).toBe(false)
    expect(needsRefresh(s, now + SESSION_REFRESH_AFTER_SECONDS * 1000)).toBe(true)
  })
})
