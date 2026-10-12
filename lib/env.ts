import { z } from 'zod'

const schema = z.object({
  // pharmcare database, connected as pharmcare_app (no DELETE privilege)
  DATABASE_URL: z.url(),
  // pharmshift's `postgres` database, same role — column-level SELECT on public.users only
  AUTH_DATABASE_URL: z.url(),
  SESSION_JWT_SECRET: z.string().min(32, 'generate with: openssl rand -base64 48'),
  // his-relay base URL; unset means patient name/clinic are typed in manually
  HIS_RELAY_URL: z.union([z.url(), z.literal('')]).optional().transform((v) => v || undefined),
  // his-relay auth: Cloudflare Access service token + shared header secret.
  // Only used when HIS_RELAY_URL is set; the relay still enforces them.
  HIS_RELAY_CF_ACCESS_CLIENT_ID: z.string().optional(),
  HIS_RELAY_CF_ACCESS_CLIENT_SECRET: z.string().optional(),
  HIS_RELAY_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

// Validated lazily so `next build` works without runtime secrets.
export function env(): Env {
  if (!cached) cached = schema.parse(process.env)
  return cached
}
