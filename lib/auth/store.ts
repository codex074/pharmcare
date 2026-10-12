import { clients } from '@/lib/db'
import type { LoginDeps } from './login'
import type { AccountRow } from './policy'
import { LOGIN_WINDOW_MINUTES } from './rate-limit'

// Database side of auth. users lives in PharmShift's database (authSql) and
// pharmcare_app may read only the granted columns — list them explicitly.

export async function findAccountByPhaId(phaId: string) {
  const { authSql } = clients()
  const rows = await authSql<(AccountRow & { password: string | null })[]>`
    select id, pha_id, prefix, f_name, l_name, role, password, is_active, must_change_password
    from public.users where pha_id = ${phaId} limit 1`
  return rows[0] ?? null
}

export async function findAccountById(id: string) {
  const { authSql } = clients()
  const rows = await authSql<AccountRow[]>`
    select id, pha_id, prefix, f_name, l_name, role, is_active, must_change_password
    from public.users where id = ${id} limit 1`
  return rows[0] ?? null
}

export const loginDeps: LoginDeps = {
  findAccount: findAccountByPhaId,

  async countFailures(phaId, ip) {
    const { sql } = clients()
    const [row] = await sql<{ by_user: number; by_ip: number }[]>`
      select count(*) filter (where pha_id = ${phaId})::int as by_user,
             count(*) filter (where ip = ${ip})::int as by_ip
      from login_attempts
      where attempted_at > now() - make_interval(mins => ${LOGIN_WINDOW_MINUTES})
        and (pha_id = ${phaId} or ip = ${ip})`
    return { byUser: row.by_user, byIp: row.by_ip }
  },

  async recordFailure(phaId, ip) {
    const { sql } = clients()
    await sql`insert into login_attempts (pha_id, ip) values (${phaId}, ${ip})`
  },
}
