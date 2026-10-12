// HN is an opaque string: keep leading zeros, drop whitespace (scanners and
// copy-paste add it), allow only the characters an HN can contain.

const HN_RE = /^[0-9A-Za-z-]{1,20}$/

export function normalizeHn(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\s+/g, '') : ''
}

export function hnError(hn: string): string | null {
  if (!hn) return 'กรอก HN'
  if (!HN_RE.test(hn)) return 'HN ใช้ได้เฉพาะตัวเลข ตัวอักษรอังกฤษ และขีด (-) ไม่เกิน 20 ตัว'
  return null
}
