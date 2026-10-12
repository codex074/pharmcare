// Patient lookup from the hospital HIS, through his-relay (step 9).
// The app must always work without it: every result except `found` means
// "type the name and pick the clinic by hand".

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

export function patientLookup(): PatientLookup {
  // QueueRelayLookup is added in step 9, selected when HIS_RELAY_URL is set.
  return new NoopLookup()
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
