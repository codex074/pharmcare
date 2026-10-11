import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '@/lib/env'
import * as schema from './schema'

type Clients = {
  sql: postgres.Sql
  authSql: postgres.Sql
  db: ReturnType<typeof drizzle<typeof schema>>
}

// Survive dev hot reloads without leaking connections; production role caps at 10.
const globalForDb = globalThis as unknown as { pharmcareDb?: Clients }

function connect(): Clients {
  const e = env()
  const sql = postgres(e.DATABASE_URL, { max: 6, idle_timeout: 30 })
  const authSql = postgres(e.AUTH_DATABASE_URL, { max: 2, idle_timeout: 30 })
  return { sql, authSql, db: drizzle(sql, { schema }) }
}

export function clients(): Clients {
  if (!globalForDb.pharmcareDb) globalForDb.pharmcareDb = connect()
  return globalForDb.pharmcareDb
}
