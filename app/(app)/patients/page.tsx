import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { hnError, normalizeHn } from '@/lib/patients/hn'

// Target of the HN search form (GET /patients?hn=…).
export default async function PatientSearch({ searchParams }: { searchParams: Promise<{ hn?: string }> }) {
  await requireUser()
  const { hn: raw } = await searchParams
  const hn = normalizeHn(raw)
  if (hnError(hn)) redirect(`/?hn=${encodeURIComponent(raw ?? '')}&invalid=1`)
  redirect(`/patients/${encodeURIComponent(hn)}`)
}
