import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupHn, QueueRelayLookup } from '@/lib/his'

const patient = {
  hn: '6900001',
  prefix: 'นาย',
  firstName: 'สมมติ',
  lastName: 'ทดสอบ',
  sex: 'male',
  birthDate: '1969-01-01',
  clinics: [{ code: 'dm', name: 'คลินิกเบาหวาน', visitDate: '2026-10-12' }],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const signal = new AbortController().signal

afterEach(() => vi.unstubAllGlobals())

describe('QueueRelayLookup', () => {
  it('maps a found patient', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(patient)))
    const r = await new QueueRelayLookup('https://his-relay.example.com').lookup('6900001', signal)
    expect(r).toEqual({ status: 'found', patient })
  })

  it('normalizes missing optional fields to null / []', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ hn: '1', firstName: 'ก', lastName: 'ข' })))
    const r = await new QueueRelayLookup('https://r').lookup('1', signal)
    expect(r).toEqual({
      status: 'found',
      patient: { hn: '1', prefix: null, firstName: 'ก', lastName: 'ข', sex: null, birthDate: null, clinics: [] },
    })
  })

  it('treats 404 and an empty 200 body as not_found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, 404)))
    expect(await new QueueRelayLookup('https://r').lookup('1', signal)).toEqual({ status: 'not_found' })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, 200)))
    expect(await new QueueRelayLookup('https://r').lookup('1', signal)).toEqual({ status: 'not_found' })
  })

  it('surfaces auth and server failures as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, 401)))
    expect(await new QueueRelayLookup('https://r').lookup('1', signal)).toMatchObject({ status: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(null, 503)))
    expect(await new QueueRelayLookup('https://r').lookup('1', signal)).toMatchObject({ status: 'unavailable' })
  })

  it('rejects a malformed patient', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ hn: 7 })))
    expect(await new QueueRelayLookup('https://r').lookup('1', signal)).toEqual({
      status: 'unavailable',
      reason: 'bad relay response',
    })
  })

  it('sends auth headers and encodes the HN', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(patient)))
    vi.stubGlobal('fetch', fetchMock)
    await new QueueRelayLookup('https://his-relay.example.com/', {
      cfAccessClientId: 'id',
      cfAccessClientSecret: 'secret',
      headerSecret: 'shh',
    }).lookup('69 00001', signal)
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }]
    expect(url).toBe('https://his-relay.example.com/patient?hn=69%2000001')
    expect(opts.headers['CF-Access-Client-Id']).toBe('id')
    expect(opts.headers['CF-Access-Client-Secret']).toBe('secret')
    expect(opts.headers['X-Relay-Secret']).toBe('shh')
  })

  it('plugs into lookupHn end to end', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(patient)))
    expect(await lookupHn('6900001', new QueueRelayLookup('https://r'))).toEqual({ status: 'found', patient })
  })
})
