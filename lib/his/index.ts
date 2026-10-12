// Patient lookup from the hospital HIS, through his-relay (step 9).
// The app must always work without it: every result except `found` means
// "type the name and pick the clinic by hand".

import { z } from 'zod'
import { env } from '@/lib/env'

export type HisClinic = { code: string; name: string; visitDate: string }

export type HisPatient = {
  hn: string
  prefix: string | null
  firstName: string
  lastName: string
  sex: 'male' | 'female' | null
  birthDate: string | null
  clinics: HisClinic[]
}

export type HisResult =
  | { status: 'found'; patient: HisPatient }
  | { status: 'not_found' }
  | { status: 'unavailable'; reason: string }
  | { status: 'not_configured' }

export interface PatientLookup {
  lookup(hn: string, signal: AbortSignal): Promise<HisResult>
}

export class NoopLookup implements PatientLookup {
  async lookup(): Promise<HisResult> {
    return { status: 'not_configured' }
  }
}

export const HIS_TIMEOUT_MS = 3000

// ─── Relay-backed lookup (step 9, app side) ─────────────────────────────────
// Contract with his-relay — GET {HIS_RELAY_URL}/patient?hn=<hn>:
//   200 + HisPatient JSON  → found
//   200 + null / {}        → not_found
//   404                    → not_found
//   401 / 403              → unavailable (Cloudflare Access / header secret)
//   anything else, non-JSON, network error → unavailable
// his-relay owns the mapping from HOSxP onto this shape (full name =
// pname + fname + " " + lname; sex normalized to male/female; clinics = today's
// visits). The app only consumes the shape below. The relay program and its
// deployment are gated on deploy/PLAN.md and are not built here.

const relayClinicSchema = z.object({
  code: z.string(),
  name: z.string(),
  visitDate: z.string(),
})

const relayPatientSchema = z.object({
  hn: z.string(),
  prefix: z.string().nullish().transform((v) => v ?? null),
  firstName: z.string(),
  lastName: z.string(),
  sex: z.enum(['male', 'female']).nullish().transform((v) => v ?? null),
  birthDate: z.string().nullish().transform((v) => v ?? null),
  clinics: z.array(relayClinicSchema).nullish().transform((v) => v ?? []),
})

export type RelayAuth = {
  cfAccessClientId?: string
  cfAccessClientSecret?: string
  headerSecret?: string
}

export class QueueRelayLookup implements PatientLookup {
  constructor(
    private readonly baseUrl: string,
    private readonly auth: RelayAuth = {},
  ) {}

  async lookup(hn: string, signal: AbortSignal): Promise<HisResult> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/patient?hn=${encodeURIComponent(hn)}`
    const headers: Record<string, string> = { accept: 'application/json' }
    if (this.auth.cfAccessClientId) headers['CF-Access-Client-Id'] = this.auth.cfAccessClientId
    if (this.auth.cfAccessClientSecret) headers['CF-Access-Client-Secret'] = this.auth.cfAccessClientSecret
    if (this.auth.headerSecret) headers['X-Relay-Secret'] = this.auth.headerSecret

    const res = await fetch(url, { headers, signal, cache: 'no-store' })

    if (res.status === 404) return { status: 'not_found' }
    if (res.status === 401 || res.status === 403)
      return { status: 'unavailable', reason: `relay auth failed (${res.status})` }
    if (!res.ok) return { status: 'unavailable', reason: `relay HTTP ${res.status}` }

    let body: unknown
    try {
      body = await res.json()
    } catch {
      return { status: 'unavailable', reason: 'relay sent non-JSON' }
    }
    if (body == null || (typeof body === 'object' && Object.keys(body as object).length === 0))
      return { status: 'not_found' }

    const parsed = relayPatientSchema.safeParse(body)
    if (!parsed.success) return { status: 'unavailable', reason: 'bad relay response' }
    return { status: 'found', patient: parsed.data }
  }
}

export function patientLookup(): PatientLookup {
  const e = env()
  if (!e.HIS_RELAY_URL) return new NoopLookup()
  return new QueueRelayLookup(e.HIS_RELAY_URL, {
    cfAccessClientId: e.HIS_RELAY_CF_ACCESS_CLIENT_ID,
    cfAccessClientSecret: e.HIS_RELAY_CF_ACCESS_CLIENT_SECRET,
    headerSecret: e.HIS_RELAY_SECRET,
  })
}

// Never throws and never waits longer than the timeout.
export async function lookupHn(hn: string, lookup: PatientLookup = patientLookup()): Promise<HisResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<HisResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort()
      resolve({ status: 'unavailable', reason: 'timeout' })
    }, HIS_TIMEOUT_MS)
  })
  try {
    return await Promise.race([
      lookup.lookup(hn, controller.signal).catch((e: unknown): HisResult => ({
        status: 'unavailable',
        reason: e instanceof Error ? e.message : 'error',
      })),
      timeout,
    ])
  } finally {
    clearTimeout(timer)
  }
}
