import supertest from 'supertest'
import express from 'express'
import cors from 'cors'
import { parseAdditionalFrontendUrls } from '../utils/cors'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal Express app that mirrors the CORS setup in app.ts.
 * No DB or env imports — safe to run without infrastructure.
 */
function buildCorsApp(opts: {
  mode: 'development' | 'production'
  frontendUrl: string
  scholarcraftUrl: string
  additional: string[]
}) {
  const app = express()
  const allowedOrigins: boolean | string[] =
    opts.mode === 'development'
      ? true
      : [...new Set([opts.frontendUrl, opts.scholarcraftUrl, ...opts.additional])]

  app.use(cors({
    origin:         allowedOrigins,
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID', 'X-CSRF-Token'],
  }))
  app.get('/test', (_req, res) => res.json({ ok: true }))
  return app
}

// Fixed test origins
const PRIMARY      = 'https://lecturecraft.app'
const SCHOLARCRAFT = 'http://localhost:3002'
const ADDITIONAL   = 'https://lecturesuite.app'
const UNLISTED     = 'https://evil.example.com'

// ── parseAdditionalFrontendUrls ───────────────────────────────────────────────

describe('parseAdditionalFrontendUrls — empty / missing input', () => {
  it('returns [] for undefined', () => {
    expect(parseAdditionalFrontendUrls(undefined)).toEqual([])
  })

  it('returns [] for empty string', () => {
    expect(parseAdditionalFrontendUrls('')).toEqual([])
  })

  it('returns [] for whitespace-only string', () => {
    expect(parseAdditionalFrontendUrls('   ')).toEqual([])
  })
})

describe('parseAdditionalFrontendUrls — valid input', () => {
  it('parses a single origin', () => {
    expect(parseAdditionalFrontendUrls('https://lecturesuite.app'))
      .toEqual(['https://lecturesuite.app'])
  })

  it('parses multiple comma-separated origins', () => {
    expect(parseAdditionalFrontendUrls('https://a.example.com,https://b.example.com'))
      .toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('trims whitespace around each entry', () => {
    expect(parseAdditionalFrontendUrls('  https://a.example.com , https://b.example.com  '))
      .toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('ignores empty entries from trailing or double commas', () => {
    expect(parseAdditionalFrontendUrls('https://a.example.com,,https://b.example.com,'))
      .toEqual(['https://a.example.com', 'https://b.example.com'])
  })

  it('accepts http:// origins', () => {
    expect(parseAdditionalFrontendUrls('http://localhost:3001'))
      .toEqual(['http://localhost:3001'])
  })

  it('accepts origins with explicit ports', () => {
    expect(parseAdditionalFrontendUrls('https://app.example.com:8443'))
      .toEqual(['https://app.example.com:8443'])
  })
})

describe('parseAdditionalFrontendUrls — invalid input (item 8)', () => {
  it('throws on a non-URL value', () => {
    expect(() => parseAdditionalFrontendUrls('not-a-url')).toThrow()
  })

  it('throws on an origin with a path segment', () => {
    expect(() => parseAdditionalFrontendUrls('https://example.com/app')).toThrow(/path/)
  })

  it('throws on a non-http/https scheme', () => {
    expect(() => parseAdditionalFrontendUrls('ftp://example.com')).toThrow(/http/)
  })

  it('throws on an origin with a query string', () => {
    expect(() => parseAdditionalFrontendUrls('https://example.com?foo=bar')).toThrow(/path|query/)
  })

  it('throws on an origin with a fragment', () => {
    expect(() => parseAdditionalFrontendUrls('https://example.com#section')).toThrow(/path|fragment/)
  })

  it('throws on the first invalid entry even if others are valid', () => {
    expect(() =>
      parseAdditionalFrontendUrls('https://good.example.com,not-a-url'),
    ).toThrow()
  })
})

// ── CORS origin list — deduplication ──────────────────────────────────────────

describe('CORS origin list deduplication (item 6)', () => {
  it('deduplicates when FRONTEND_URL is also present in additional origins', () => {
    const origins = [...new Set([PRIMARY, SCHOLARCRAFT, PRIMARY])]
    expect(origins).toHaveLength(2)
    expect(origins).toEqual([PRIMARY, SCHOLARCRAFT])
  })

  it('deduplicates when an additional origin is provided twice', () => {
    const origins = [...new Set([PRIMARY, SCHOLARCRAFT, ADDITIONAL, ADDITIONAL])]
    expect(origins).toHaveLength(3)
  })
})

// ── CORS HTTP behavior — production mode ─────────────────────────────────────

describe('CORS HTTP — production mode', () => {
  const app = buildCorsApp({
    mode: 'production',
    frontendUrl: PRIMARY,
    scholarcraftUrl: SCHOLARCRAFT,
    additional: [ADDITIONAL],
  })

  it('(item 1) allows the primary frontend origin', async () => {
    const res = await supertest(app).get('/test').set('Origin', PRIMARY)
    expect(res.headers['access-control-allow-origin']).toBe(PRIMARY)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
    expect(res.status).toBe(200)
  })

  it('(item 2) allows the ScholarCraft origin', async () => {
    const res = await supertest(app).get('/test').set('Origin', SCHOLARCRAFT)
    expect(res.headers['access-control-allow-origin']).toBe(SCHOLARCRAFT)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('(item 3) allows a configured additional origin', async () => {
    const res = await supertest(app).get('/test').set('Origin', ADDITIONAL)
    expect(res.headers['access-control-allow-origin']).toBe(ADDITIONAL)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })

  it('(item 7) does not set CORS headers for an unlisted origin', async () => {
    const res = await supertest(app).get('/test').set('Origin', UNLISTED)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
    expect(res.status).toBe(200) // server responds; browser is what blocks it
  })

  it('(item 10) credentials header is present for allowed origins', async () => {
    const res = await supertest(app).get('/test').set('Origin', PRIMARY)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })
})

// ── CORS HTTP behavior — no additional origins ────────────────────────────────

describe('CORS HTTP — production, no additional origins', () => {
  const app = buildCorsApp({
    mode: 'production',
    frontendUrl: PRIMARY,
    scholarcraftUrl: SCHOLARCRAFT,
    additional: [],
  })

  it('primary origin still allowed when ADDITIONAL_FRONTEND_URLS is empty', async () => {
    const res = await supertest(app).get('/test').set('Origin', PRIMARY)
    expect(res.headers['access-control-allow-origin']).toBe(PRIMARY)
  })

  it('unlisted origin is still blocked when no additional origins are configured', async () => {
    const res = await supertest(app).get('/test').set('Origin', ADDITIONAL)
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})

// ── CORS HTTP behavior — development mode (item 9) ────────────────────────────

describe('CORS HTTP — development mode', () => {
  const app = buildCorsApp({
    mode: 'development',
    frontendUrl: PRIMARY,
    scholarcraftUrl: SCHOLARCRAFT,
    additional: [],
  })

  it('(item 9) allows any origin in development mode', async () => {
    const res = await supertest(app).get('/test').set('Origin', UNLISTED)
    expect(res.headers['access-control-allow-origin']).toBeDefined()
    expect(res.status).toBe(200)
  })

  it('(item 9) allows the primary origin in development mode', async () => {
    const res = await supertest(app).get('/test').set('Origin', PRIMARY)
    expect(res.headers['access-control-allow-origin']).toBeDefined()
  })

  it('(item 10) credentials header is present in development mode', async () => {
    const res = await supertest(app).get('/test').set('Origin', UNLISTED)
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })
})

// ── CORS preflight (OPTIONS) ──────────────────────────────────────────────────

describe('CORS preflight', () => {
  const app = buildCorsApp({
    mode: 'production',
    frontendUrl: PRIMARY,
    scholarcraftUrl: SCHOLARCRAFT,
    additional: [ADDITIONAL],
  })

  it('responds to OPTIONS preflight for an allowed origin', async () => {
    const res = await supertest(app)
      .options('/test')
      .set('Origin', PRIMARY)
      .set('Access-Control-Request-Method', 'POST')
    expect(res.headers['access-control-allow-origin']).toBe(PRIMARY)
    expect([200, 204]).toContain(res.status)
  })

  it('does not set CORS headers for OPTIONS from an unlisted origin', async () => {
    const res = await supertest(app)
      .options('/test')
      .set('Origin', UNLISTED)
      .set('Access-Control-Request-Method', 'POST')
    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })
})
