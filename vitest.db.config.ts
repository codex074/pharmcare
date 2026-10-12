import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Tests that need the dev database (npm run db:up && npm run db:migrate).
try {
  process.loadEnvFile('.env.local')
} catch {}

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { environment: 'node', include: ['test/db/**/*.dbtest.ts'], fileParallelism: false },
})
