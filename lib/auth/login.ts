import { verifyPassword, isBcryptHash } from './password'
import { accessDenial, DENIAL_MESSAGE, type AccountRow } from './policy'
import { isRateLimited, RATE_LIMIT_MESSAGE, type FailureCounts } from './rate-limit'

export const BAD_CREDENTIALS_MESSAGE = 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'

export type LoginDeps = {
  findAccount(phaId: string): Promise<(AccountRow & { password: string | null }) | null>
  countFailures(phaId: string, ip: string): Promise<FailureCounts>
  recordFailure(phaId: string, ip: string): Promise<void>
}

export type LoginResult =
  | { ok: true; account: AccountRow }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'bad_credentials' | 'denied'; message: string }

export function normalizePhaId(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

// Order matters: rate limit → password → account state. Account state is only
// revealed to someone who already knows the password.
export async function attemptLogin(rawPhaId: unknown, rawPassword: unknown, ip: string, deps: LoginDeps): Promise<LoginResult> {
  const phaId = normalizePhaId(rawPhaId)
  const password = typeof rawPassword === 'string' ? rawPassword : ''
  if (!phaId || !password) {
    return { ok: false, reason: 'invalid', message: 'กรุณากรอกรหัสผู้ใช้และรหัสผ่าน' }
  }

  if (isRateLimited(await deps.countFailures(phaId, ip))) {
    return { ok: false, reason: 'rate_limited', message: RATE_LIMIT_MESSAGE }
  }

  const account = await deps.findAccount(phaId)
  if (!account || !(await verifyPassword(password, account.password))) {
    await deps.recordFailure(phaId, ip)
    return { ok: false, reason: 'bad_credentials', message: BAD_CREDENTIALS_MESSAGE }
  }

  const denial = accessDenial(account) ?? (isBcryptHash(account.password) ? null : 'must_change_password')
  if (denial) return { ok: false, reason: 'denied', message: DENIAL_MESSAGE[denial] }

  const { password: _password, ...row } = account
  void _password
  return { ok: true, account: row }
}
