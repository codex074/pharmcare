import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Clinical tables are added in step 3 (see docs/PROGRESS.md).
// GRANTs for pharmcare_app are hand-written in drizzle/*_grants*.sql.

// Failed logins only. pharmcare_app: SELECT, INSERT.
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaId: text('pha_id').notNull(),
    ip: text('ip').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('login_attempts_pha_id_idx').on(t.phaId, t.attemptedAt),
    index('login_attempts_ip_idx').on(t.ip, t.attemptedAt),
  ],
)
