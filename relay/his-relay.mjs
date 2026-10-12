// his-relay — runs inside the hospital network, bridges PharmCare (outside the
// LAN) to HOSxP. Exposes exactly one endpoint, GET /patient?hn=, returning the
// HisPatient shape the app consumes (see lib/his/index.ts).
//
// Source: the pharmacy-queue backend (NestJS at QUEUE_API_URL). Its
// GET /his/patient/hn already returns both the name and today's clinic, so this
// draft uses it for both. CLAUDE.md's intended split (name from the central
// /api/hosxp API, clinic from the queue program) must be reconciled with
// deploy/PLAN.md before production — this file is the working step-9 draft.
//
// NOT part of the Next.js build. Plain Node (fetch is built in on Node 18+).
// Run it yourself with a dedicated service account — never a personal login.
//
//   $env:QUEUE_API_URL   = "http://172.17.1.240/api/v1"
//   $env:QUEUE_USERNAME  = "<pharmcare service account>"
//   $env:QUEUE_PASSWORD  = "<password>"
//   $env:RELAY_SHARED_SECRET = "<same value as the app's HIS_RELAY_SECRET>"
//   node relay/his-relay.mjs
//
// In production the relay sits behind cloudflared + Cloudflare Access; the
// shared-secret header is a second, app-level check and is required here.

import { createServer } from 'node:http'

const PORT = Number(process.env.RELAY_PORT || 4000)
const API = (process.env.QUEUE_API_URL || '').replace(/\/+$/, '')
const USERNAME = process.env.QUEUE_USERNAME || ''
const PASSWORD = process.env.QUEUE_PASSWORD || ''
const SHARED_SECRET = process.env.RELAY_SHARED_SECRET || ''

if (!API || !USERNAME || !PASSWORD) {
  console.error('set QUEUE_API_URL, QUEUE_USERNAME and QUEUE_PASSWORD')
  process.exit(1)
}

// ─── queue API auth: cache the JWT, re-login on 401 ─────────────────────────
let token = null

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'his-relay' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error(`[login] ${res.status} as user "${USERNAME}" (pw ${PASSWORD.length} chars) — ${detail.slice(0, 300)}`)
    throw new Error(`queue login failed (${res.status})`)
  }
  const body = await res.json()
  token = body?.data?.accessToken
  if (!token) {
    console.error('[login] 200 but no accessToken; body keys:', Object.keys(body || {}), 'data keys:', Object.keys(body?.data || {}))
    throw new Error('queue login returned no accessToken')
  }
  console.error(`[login] ok as "${USERNAME}"`)
}

async function queueGet(path) {
  if (!token) await login()
  let res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } })
  if (res.status === 401) {
    await login()
    res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${token}` } })
  }
  return res
}

// ─── map the queue patient record onto HisPatient ───────────────────────────
function mapSex(v) {
  if (v === 'male' || v === 'M' || v === 1 || v === '1' || v === 'ชาย') return 'male'
  if (v === 'female' || v === 'F' || v === 2 || v === '2' || v === 'หญิง') return 'female'
  return null
}

function toHisPatient(d) {
  const clinicName = d.clinicName ?? null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
  return {
    hn: String(d.hn ?? ''),
    prefix: d.pname ?? d.prefix ?? null,
    firstName: d.firstName ?? d.fname ?? '',
    lastName: d.lastName ?? d.lname ?? '',
    sex: mapSex(d.sex),
    birthDate: d.birthDate ?? null,
    clinics: clinicName
      ? [{ code: d.clinicCode ?? '', name: clinicName, visitDate: d.visitDate ?? today }]
      : [],
  }
}

// ─── HTTP: GET /patient?hn= ─────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const send = (status, obj) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(obj === null ? 'null' : JSON.stringify(obj))
  }

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    if (req.method !== 'GET' || url.pathname !== '/patient') return send(404, { error: 'not found' })

    if (SHARED_SECRET && req.headers['x-relay-secret'] !== SHARED_SECRET)
      return send(401, { error: 'bad relay secret' })

    const hn = (url.searchParams.get('hn') || '').trim()
    if (!hn) return send(400, { error: 'hn required' })

    const r = await queueGet(`/his/patient/hn?hn=${encodeURIComponent(hn)}`)
    if (r.status === 404) return send(404, null)
    if (!r.ok) return send(502, { error: `queue API ${r.status}` })

    const body = await r.json()
    const data = body?.data ?? body
    if (!data || !data.hn) return send(404, null) // no patient for this HN

    // DEBUG: print available field NAMES only (no values → no PII) so the
    // clinic field can be mapped correctly. Remove once mapping is confirmed.
    console.error('[patient] fields:', Object.keys(data).join(', '))

    return send(200, toHisPatient(data))
  } catch (e) {
    return send(502, { error: e instanceof Error ? e.message : 'relay error' })
  }
})

server.listen(PORT, '127.0.0.1', () => console.log(`his-relay on http://127.0.0.1:${PORT}`))
