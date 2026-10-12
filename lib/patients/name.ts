// Split a typed Thai full name into prefix / first / last.
// The longest matching prefix wins (นางสาว before นาง).

const PREFIXES = [
  'นางสาว', 'น.ส.', 'นาง', 'นาย', 'ด.ช.', 'ด.ญ.', 'เด็กชาย', 'เด็กหญิง',
  'พระภิกษุ', 'พระ', 'สามเณร', 'ภก.', 'ภญ.', 'นพ.', 'พญ.', 'ทพ.', 'ทพญ.', 'ดร.', 'Mr.', 'Mrs.', 'Ms.', 'Miss',
].sort((a, b) => b.length - a.length)

export type ParsedName = { prefix: string | null; firstName: string; lastName: string }

export function parseFullName(raw: string): ParsedName | null {
  let rest = raw.trim().replace(/\s+/g, ' ')
  let prefix: string | null = null
  for (const p of PREFIXES) {
    if (rest.startsWith(p)) {
      prefix = p
      rest = rest.slice(p.length).trim()
      break
    }
  }
  const [firstName, ...others] = rest.split(' ')
  const lastName = others.join(' ')
  if (!firstName || !lastName) return null
  return { prefix, firstName, lastName }
}

export function fullName(p: { prefix: string | null; firstName: string; lastName: string }): string {
  return `${p.prefix ?? ''}${p.firstName} ${p.lastName}`
}

// Two-letter avatar initials: first letters of first and last name.
// Thai leading vowels (เ แ โ ใ ไ) are skipped so "เกศินี" gives ก, not เ.
export function initials(firstName: string, lastName: string): string {
  const first = (s: string) => s.replace(/^[เแโใไ]/, '').charAt(0)
  return first(firstName) + first(lastName)
}
