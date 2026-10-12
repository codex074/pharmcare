export const LOGIN_WINDOW_MINUTES = 15
export const MAX_FAILURES_PER_USER = 5
export const MAX_FAILURES_PER_IP = 30

export const RATE_LIMIT_MESSAGE = 'พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่'

export type FailureCounts = { byUser: number; byIp: number }

export function isRateLimited(counts: FailureCounts): boolean {
  return counts.byUser >= MAX_FAILURES_PER_USER || counts.byIp >= MAX_FAILURES_PER_IP
}

// Only Cloudflare's header: both the tunnel (pve1) and the failover nginx (VPS)
// sit behind Cloudflare, and X-Forwarded-For is client-controlled.
export function clientIp(headers: Headers): string {
  return headers.get('cf-connecting-ip')?.trim() || 'local'
}
