import bcrypt from 'bcryptjs'

const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/

export function isBcryptHash(value: string | null | undefined): value is string {
  return typeof value === 'string' && BCRYPT_RE.test(value)
}

// PharmShift still has a few legacy plaintext passwords. They verify here so the
// pharmacist gets the "change it in PharmShift" message instead of "wrong password";
// login refuses them afterwards because PharmCare cannot rehash (no write on users).
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  if (isBcryptHash(stored)) return bcrypt.compare(password, stored)
  return password === stored
}
