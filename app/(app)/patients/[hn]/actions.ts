'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/dal'
import { CLINIC } from '@/lib/codes'
import { withActor } from '@/lib/db'
import { patients } from '@/lib/db/schema'
import { parseFullName } from '@/lib/patients/name'
import { birthDateFromAge, fieldErrors, registerSchema, type FieldErrors } from '@/lib/patients/register-schema'
import { bangkokDate } from '@/lib/thai-date'

export type RegisterState = { errors?: FieldErrors; message?: string } | undefined

const field = (fd: FormData, k: string) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v : undefined
}

export async function registerPatient(_prev: RegisterState, fd: FormData): Promise<RegisterState> {
  const user = await requireUser()
  const parsed = registerSchema.safeParse({
    hn: field(fd, 'hn') ?? '',
    fullName: field(fd, 'fullName') ?? '',
    sex: field(fd, 'sex'),
    age: field(fd, 'age') ?? '',
    clinic: field(fd, 'clinic') ?? '',
    allergy: field(fd, 'allergy') ?? '',
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  const v = parsed.data
  const name = parseFullName(v.fullName)!
  const target = `/patients/${encodeURIComponent(v.hn)}${v.clinic ? `?clinic=${v.clinic}` : ''}`
  try {
    await withActor(user, (tx) =>
      tx.insert(patients).values({
        hn: v.hn,
        prefix: name.prefix,
        firstName: name.firstName,
        lastName: name.lastName,
        sex: v.sex,
        birthDate: v.age == null ? null : birthDateFromAge(v.age, bangkokDate()),
        birthDateEstimated: v.age != null,
        mainClinicCode: v.clinic,
        mainClinicName: v.clinic ? CLINIC[v.clinic] : null,
        allergySummary: v.allergy,
      }),
    )
  } catch (e) {
    // Someone registered this HN a moment ago: open their registration instead.
    const err = e as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } }
    const pg = err.cause ?? err
    if (pg.code !== '23505' || pg.constraint_name !== 'patients_hn_active_uq') {
      console.error('[registerPatient]', e)
      return { message: 'ลงทะเบียนไม่สำเร็จ ลองอีกครั้ง' }
    }
  }
  redirect(target)
}
