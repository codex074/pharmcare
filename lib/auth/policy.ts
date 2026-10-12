// Who may use PharmCare, decided from PharmShift's users row.

export const ALLOWED_ROLES = ['pharmacist', 'admin'] as const

// Exactly the columns pharmcare_app is granted on public.users. Never select more:
// any other column fails with permission denied.
export type AccountRow = {
  id: string
  pha_id: string
  prefix: string | null
  f_name: string
  l_name: string
  role: string
  is_active: boolean | null
  must_change_password: boolean | null
}

export type Denial = 'inactive' | 'not_pharmacist' | 'must_change_password'

export const DENIAL_MESSAGE: Record<Denial, string> = {
  inactive: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
  not_pharmacist: 'บัญชีนี้ไม่มีสิทธิ์เข้าระบบ (เฉพาะเภสัชกร)',
  must_change_password: 'กรุณาเปลี่ยนรหัสผ่านใน PharmShift ก่อน',
}

export function accessDenial(user: AccountRow): Denial | null {
  if (user.is_active === false) return 'inactive'
  if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) return 'not_pharmacist'
  if (user.must_change_password === true) return 'must_change_password'
  return null
}

export function displayName(user: Pick<AccountRow, 'prefix' | 'f_name' | 'l_name'>): string {
  return `${user.prefix ?? ''}${user.f_name} ${user.l_name}`.trim()
}
