import { defineConfig } from 'drizzle-kit'

// Migrations run as pharmcare_owner; the app itself never holds DDL rights.
try {
  process.loadEnvFile('.env.local')
} catch {}

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.MIGRATION_DATABASE_URL! },
})
