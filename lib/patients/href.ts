export type PatientParams = { tab?: string; clinic?: string; form?: string; edit?: string; cancel?: string; cancelled?: string }

export function patientHref(hn: string, p: PatientParams): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v)
  const s = q.toString()
  return `/patients/${encodeURIComponent(hn)}${s ? `?${s}` : ''}`
}
