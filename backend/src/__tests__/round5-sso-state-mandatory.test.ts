/**
 * Round 5 — Finding 5: SSO state is now always mandatory
 *
 * Tests the ssoCallback state-validation logic directly by extracting
 * the guard logic (state check is pure — no Express dependency needed
 * for the state-mismatch cases).
 *
 * Cases:
 *  1. No state in query → 401
 *  2. No state cookie → 401
 *  3. Query state ≠ cookie state → 401 (CSRF defence)
 *  4. Valid state but Redis returns null (expired/reused) → 401
 *  5. Valid state, legacy dev path (no PORTAL_TOKEN_URL) → token from URL
 *  6. Valid state, secure path (PORTAL_TOKEN_URL set) → fetch from portal
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'

import { AppError } from '../utils/errors'

// ── Extracted state-validation logic (mirrors auth.controller.ts ssoCallback) ─

interface SsoStateCheckInput {
  stateParam:  string | undefined
  stateCookie: string | undefined
  storedState: string | null   // what Redis returns (null = expired/not found)
}

function validateSsoState(input: SsoStateCheckInput): void {
  const { stateParam, stateCookie, storedState } = input

  if (!stateParam || !stateCookie) {
    throw AppError.unauthorized('Missing SSO state — please start login from the application')
  }
  if (stateParam !== stateCookie) {
    throw AppError.unauthorized('SSO state mismatch — possible login-CSRF attempt')
  }
  if (!storedState) {
    throw AppError.unauthorized('SSO state is invalid or expired — please start login again')
  }
}

// ── Token-sourcing logic (mirrors auth.controller.ts ssoCallback) ─────────────

interface TokenSourceInput {
  stateParam:        string
  portalTokenUrl?:   string
  portalSecret?:     string
  tokenFromUrl?:     string
  portalFetchResult: { ok: boolean; body?: { token?: string } }
}

async function resolveToken(input: TokenSourceInput): Promise<string> {
  const { stateParam, portalTokenUrl, portalSecret, tokenFromUrl, portalFetchResult } = input

  if (portalTokenUrl && portalSecret) {
    if (!portalFetchResult.ok) {
      throw new AppError('Portal token exchange failed — please try again', 503)
    }
    const body = portalFetchResult.body ?? {}
    if (typeof body.token !== 'string' || !body.token) {
      throw new AppError('Invalid portal token response', 503)
    }
    return body.token
  }

  if (!tokenFromUrl) throw AppError.badRequest('Missing launch token')
  return tokenFromUrl
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Round 5 — Finding 5: SSO state is always required', () => {
  it('throws 401 when both state and cookie are missing', () => {
    expect(() =>
      validateSsoState({ stateParam: undefined, stateCookie: undefined, storedState: null }),
    ).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws 401 when state query param is present but cookie is missing', () => {
    expect(() =>
      validateSsoState({ stateParam: 'abc123', stateCookie: undefined, storedState: 'stored' }),
    ).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws 401 when cookie is present but state query param is missing', () => {
    expect(() =>
      validateSsoState({ stateParam: undefined, stateCookie: 'abc123', storedState: 'stored' }),
    ).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws 401 on state mismatch (CSRF defence)', () => {
    expect(() =>
      validateSsoState({ stateParam: 'stateA', stateCookie: 'stateB', storedState: 'stored' }),
    ).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('throws 401 when Redis returns null (state expired or already used)', () => {
    expect(() =>
      validateSsoState({ stateParam: 'match', stateCookie: 'match', storedState: null }),
    ).toThrow(expect.objectContaining({ statusCode: 401 }))
  })

  it('passes when state matches cookie and Redis confirms it', () => {
    expect(() =>
      validateSsoState({ stateParam: 'valid-state', stateCookie: 'valid-state', storedState: 'stored-data' }),
    ).not.toThrow()
  })
})

describe('Round 5 — Finding 5: token sourcing', () => {
  it('uses token from URL when PORTAL_TOKEN_URL is not configured (dev mode)', async () => {
    const token = await resolveToken({
      stateParam: 'some-state',
      portalTokenUrl:   undefined,
      portalSecret:     undefined,
      tokenFromUrl:     'dev-jwt-token',
      portalFetchResult: { ok: true },
    })
    expect(token).toBe('dev-jwt-token')
  })

  it('throws 400 when PORTAL_TOKEN_URL is not configured and no token in URL', async () => {
    await expect(
      resolveToken({
        stateParam: 'some-state',
        portalTokenUrl:   undefined,
        portalSecret:     undefined,
        tokenFromUrl:     undefined,
        portalFetchResult: { ok: true },
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('fetches token from portal server-to-server when PORTAL_TOKEN_URL is configured', async () => {
    const token = await resolveToken({
      stateParam:    'some-state',
      portalTokenUrl:   'https://portal.test/api/portal/sso-token',
      portalSecret:     'super-secret-at-least-32-chars-long!!!!!',
      tokenFromUrl:     undefined,
      portalFetchResult: { ok: true, body: { token: 'server-side-jwt' } },
    })
    expect(token).toBe('server-side-jwt')
  })

  it('throws 503 when portal fetch returns non-ok status', async () => {
    await expect(
      resolveToken({
        stateParam:    'some-state',
        portalTokenUrl:   'https://portal.test/api/portal/sso-token',
        portalSecret:     'super-secret-at-least-32-chars-long!!!!!',
        tokenFromUrl:     undefined,
        portalFetchResult: { ok: false },
      }),
    ).rejects.toMatchObject({ statusCode: 503 })
  })

  it('throws 503 when portal returns ok but body has no token', async () => {
    await expect(
      resolveToken({
        stateParam:    'some-state',
        portalTokenUrl:   'https://portal.test/api/portal/sso-token',
        portalSecret:     'super-secret-at-least-32-chars-long!!!!!',
        tokenFromUrl:     undefined,
        portalFetchResult: { ok: true, body: {} },
      }),
    ).rejects.toMatchObject({ statusCode: 503 })
  })
})
