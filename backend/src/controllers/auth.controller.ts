import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { Request, Response } from 'express'
import { authService } from '../services/auth/auth.service'
import { rotateRefreshToken, revokeRefreshToken, signAccessToken, createRefreshToken } from '../services/auth/jwt.service'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'
import { redis } from '../config/redis'
import { env } from '../config/env'
import { uploadToR2, deleteFromR2, isR2Configured, validateImageMagicBytes, mimeToExt } from '../services/storage/storage.service'
import { requireCentralEntitlement } from '../services/auth/central-entitlement'
import { PRODUCT_ID } from '../config/product'
import type { AuthPayload } from '../middleware/auth.middleware'

const SSO_CODE_TTL_SECONDS = 60
const SSO_PENDING_COOKIE   = 'lc_sso_pending'
const SSO_BINDING_COOKIE   = 'lc_sso_binding'

const REFRESH_COOKIE = 'lc_refresh'
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/api/auth',
}

function getIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? ''
}

export const authController = {
  // ── Public institution list (for student sign-up dropdown) ───────────────

  listInstitutions: asyncHandler(async (_req: Request, res: Response) => {
    const data = await prisma.institution.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json({ status: 'success', data })
  }),

  // ── Registration ──────────────────────────────────────────────────────────

  registerInstitution: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.registerInstitution(req.body)
    res.status(201).json({ status: 'success', ...result })
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body)
    res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, COOKIE_OPTS)
    res.status(201).json({ status: 'success', user: result.user, tokens: { accessToken: result.tokens.accessToken } })
  }),

  // ── Login / Logout ────────────────────────────────────────────────────────

  login: asyncHandler(async (req: Request, res: Response) => {
    const ip        = getIp(req)
    const userAgent = req.headers['user-agent'] ?? ''
    const result    = await authService.login({ ...req.body, ip, userAgent })

    res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, COOKIE_OPTS)
    res.json({
      status: 'success',
      user:   result.user,
      institution: result.institution,
      tokens: { accessToken: result.tokens.accessToken },
    })
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    // Accept token from cookie OR body (for clients that can't use cookies)
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined)
      ?? (req.body as { refreshToken?: string }).refreshToken

    if (!token) throw AppError.badRequest('Refresh token required')

    const { accessToken, refreshToken: newRefresh } = await rotateRefreshToken(token)
    res.cookie(REFRESH_COOKIE, newRefresh, COOKIE_OPTS)
    res.json({ status: 'success', tokens: { accessToken } })
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined)
      ?? (req.body as { refreshToken?: string }).refreshToken

    if (token) await revokeRefreshToken(token)
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    res.json({ status: 'success', message: 'Logged out successfully' })
  }),

  // ── Password ──────────────────────────────────────────────────────────────

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword((req.body as { email: string }).email)
    res.json({ status: 'success', message: 'If that email is registered, a reset link has been sent.' })
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string }
    await authService.resetPassword(token, password)
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    res.json({ status: 'success', message: 'Password reset successfully' })
  }),

  // ── Email Verification ────────────────────────────────────────────────────

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    await authService.verifyEmail((req.body as { token: string }).token)
    res.json({ status: 'success', message: 'Email verified successfully' })
  }),

  resendVerification: asyncHandler(async (req: Request, res: Response) => {
    await authService.resendVerification((req.body as { email: string }).email)
    res.json({ status: 'success', message: 'Verification email sent' })
  }),

  // ── Profile ───────────────────────────────────────────────────────────────

  me: asyncHandler(async (req: Request, res: Response) => {
    const { institution, roles, ...user } = await authService.getMe(req.user!.userId)
    res.json({ status: 'success', user, institution, roles })
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.userId, req.body)
    res.json({ status: 'success', user })
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('No image file provided')

    const { buffer, mimetype } = req.file
    if (!validateImageMagicBytes(buffer, mimetype)) {
      throw AppError.badRequest('File content does not match the declared image type')
    }

    const userId = req.user!.userId
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } })

    // Safe upload ordering: upload NEW → update DB → delete OLD.
    // If the DB update fails, the new upload is cleaned up. The old file is only
    // removed after a confirmed DB update so the reference is never orphaned.
    let avatarUrl: string
    let newR2Url: string | null = null

    if (isR2Configured()) {
      newR2Url = await uploadToR2('avatars', buffer, mimetype)
      avatarUrl = newR2Url
    } else {
      // Local-disk fallback — not suitable for production (ephemeral filesystem)
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars')
      fs.mkdirSync(uploadsDir, { recursive: true })
      const filename = `${userId}.${mimeToExt(mimetype)}`
      fs.writeFileSync(path.join(uploadsDir, filename), buffer)
      avatarUrl = `/uploads/avatars/${filename}`
    }

    let user: Awaited<ReturnType<typeof prisma.user.update>>
    try {
      user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl } })
    } catch (err) {
      if (newR2Url) await deleteFromR2(newR2Url).catch(() => null)
      throw err
    }

    // DB succeeded — clean up old object (best-effort)
    const oldUrl = existing?.avatarUrl
    if (newR2Url && oldUrl && !oldUrl.startsWith('/uploads/')) {
      await deleteFromR2(oldUrl).catch(() => null)
    } else if (!newR2Url && oldUrl?.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), oldUrl)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    res.json({ status: 'success', avatarUrl: user.avatarUrl })
  }),

  uploadInstitutionLogo: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw AppError.badRequest('No image file provided')

    const { buffer, mimetype } = req.file
    if (!validateImageMagicBytes(buffer, mimetype)) {
      throw AppError.badRequest('File content does not match the declared image type')
    }

    const userId = req.user!.userId
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { personalInstitutionLogoUrl: true } })

    let logoUrl: string
    let newR2LogoUrl: string | null = null

    if (isR2Configured()) {
      newR2LogoUrl = await uploadToR2('institution-logos', buffer, mimetype)
      logoUrl = newR2LogoUrl
    } else {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'institution-logos')
      fs.mkdirSync(uploadsDir, { recursive: true })
      const filename = `${userId}.${mimeToExt(mimetype)}`
      fs.writeFileSync(path.join(uploadsDir, filename), buffer)
      logoUrl = `/uploads/institution-logos/${filename}`
    }

    try {
      await prisma.user.update({ where: { id: userId }, data: { personalInstitutionLogoUrl: logoUrl } })
    } catch (err) {
      if (newR2LogoUrl) await deleteFromR2(newR2LogoUrl).catch(() => null)
      throw err
    }

    const oldLogoUrl = existing?.personalInstitutionLogoUrl
    if (newR2LogoUrl && oldLogoUrl && !oldLogoUrl.startsWith('/uploads/')) {
      await deleteFromR2(oldLogoUrl).catch(() => null)
    } else if (!newR2LogoUrl && oldLogoUrl?.startsWith('/uploads/institution-logos/')) {
      const oldPath = path.join(process.cwd(), oldLogoUrl)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    res.json({ status: 'success', logoUrl })
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    await authService.changePassword(req.user!.userId, currentPassword, newPassword)
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    res.json({ status: 'success', message: 'Password updated. Please log in again.' })
  }),

  // ── Sessions ──────────────────────────────────────────────────────────────

  getSessions: asyncHandler(async (req: Request, res: Response) => {
    const sessions = await authService.getSessions(req.user!.userId)
    res.json({ status: 'success', sessions })
  }),

  terminateSession: asyncHandler(async (req: Request, res: Response) => {
    await authService.terminateSession(req.user!.userId, String(req.params.sessionId))
    res.json({ status: 'success', message: 'Session terminated' })
  }),

  terminateAllSessions: asyncHandler(async (req: Request, res: Response) => {
    await authService.terminateAllSessions(req.user!.userId)
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    res.json({ status: 'success', message: 'All sessions terminated' })
  }),

  // ── SSO callback — called by portal launch redirect ───────────────────────
  // Validates a short-lived launch token issued by uamsatech.com, finds or
  // provisions the user in the craftsuite DB, issues a LectureSuite session,
  // then redirects the browser to the frontend with the tokens in the URL.

  ssoCallback: asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token as string | undefined
    if (!token) throw AppError.badRequest('Missing launch token')

    let payload: { sub?: unknown; email?: unknown; type?: unknown; target?: unknown; jti?: unknown; iss?: unknown; aud?: unknown; exp?: unknown }
    try {
      // HS256 only. maxAge caps the lifetime at 5 min from iat (and requires iat),
      // independent of whatever exp the token carries.
      payload = jwt.verify(token, env.CRAFT_LAUNCH_SECRET, { algorithms: ['HS256'], maxAge: '5m' }) as typeof payload
    } catch {
      throw AppError.unauthorized('Invalid or expired launch token')
    }
    if (typeof payload !== 'object' || payload === null) {
      throw AppError.unauthorized('Invalid or expired launch token')
    }

    if (payload.type !== 'product_launch' || payload.target !== 'lecturesuite') {
      throw AppError.unauthorized('Token not valid for this product')
    }

    if (payload.iss !== 'uamsatech') {
      throw AppError.unauthorized('Token not valid for this product')
    }

    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
    if (!aud.includes('lecturesuite')) {
      throw AppError.unauthorized('Token not valid for this product')
    }

    if (typeof payload.exp !== 'number') throw AppError.unauthorized('Launch token missing expiry')

    const jti = payload.jti
    if (typeof jti !== 'string' || jti.length === 0) throw AppError.unauthorized('Launch token missing jti')

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw AppError.unauthorized('Launch token missing subject')
    }

    const email = typeof payload.email === 'string' ? payload.email : ''
    if (!email || !email.includes('@')) throw AppError.badRequest('Missing email in launch token')

    // Replay protection: atomically record the jti (SET NX). Fails CLOSED — if
    // Redis is unavailable the launch is refused rather than accepted unchecked.
    // TTL is 2x the 5-min token lifetime to absorb clock skew with the portal.
    let stored: string | null
    try {
      stored = await redis.set(`sso:jti:${jti}`, '1', 'EX', 600, 'NX')
    } catch (err) {
      console.error('SSO replay protection unavailable (Redis):', (err as Error).message)
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }
    if (stored !== 'OK') throw AppError.unauthorized('Launch token already used')

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name:          email.split('@')[0],
          password:      '',
          role:          'LECTURER',
          status:        'ACTIVE',
          emailVerified: true,
        },
      })
    } else {
      // Portal is the identity provider for SSO users. Clear any locally-set
      // password so a pre-registered account cannot retain password access
      // after the real owner launches via SSO.
      user = await prisma.user.update({
        where: { id: user.id },
        data:  { emailVerified: true, status: 'ACTIVE', password: '' },
      })
    }

    await prisma.userProductRole.upsert({
      where:  { userId_product: { userId: user.id, product: 'lecturesuite' } },
      create: { userId: user.id, product: 'lecturesuite', role: 'LECTURER' },
      update: {},
    })

    // Issue a short-lived (60 s) single-use authorization code stored in Redis.
    // The code is delivered via an HttpOnly cookie on the redirect response —
    // never in the redirect URL — so it does not appear in proxy access logs,
    // browser history, or Referer headers. POST /api/auth/sso/exchange reads the
    // cookie automatically; JavaScript cannot read or forward it.
    const code    = crypto.randomBytes(32).toString('hex')
    // Finding 6: generate a per-login binding nonce that ties this code to
    // the browser tab that initiated the SSO flow. The nonce is delivered as
    // a separate HttpOnly cookie and stored alongside the code in Redis.
    // ssoExchange must present the matching binding cookie or the exchange fails,
    // preventing a cross-site login-CSRF attack where an attacker tricks the
    // browser into completing a code exchange for the attacker's own session.
    const binding = crypto.randomBytes(32).toString('hex')
    const redisPayload = JSON.stringify({ userId: user.id, binding })
    let codeStored: string | null
    try {
      codeStored = await redis.set(`sso:code:${code}`, redisPayload, 'EX', SSO_CODE_TTL_SECONDS, 'NX')
    } catch (err) {
      console.error('SSO code store unavailable (Redis):', (err as Error).message)
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }
    if (codeStored !== 'OK') {
      // Collision — astronomically unlikely with 32 random bytes, treat as server error
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }

    const ssoCookieOpts = {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge:   SSO_CODE_TTL_SECONDS * 1000,
      path:     '/api/auth/sso/exchange',
    }
    res.cookie(SSO_PENDING_COOKIE, code, ssoCookieOpts)
    res.cookie(SSO_BINDING_COOKIE, binding, ssoCookieOpts)
    res.redirect(`${env.FRONTEND_URL}/auth/sso`)
  }),

  // ── SSO exchange — called by frontend to swap the auth code for tokens ───
  // The auth code is read from an HttpOnly cookie set by ssoCallback, binding
  // the exchange to the browser session that received the redirect. The code
  // is never accepted from the request body to prevent interception replays.
  // Finding 6: a second binding cookie ties this exchange to the exact login
  // that set the pending cookie, preventing login-CSRF.
  ssoExchange: asyncHandler(async (req: Request, res: Response) => {
    const code    = req.cookies?.[SSO_PENDING_COOKIE] as string | undefined
    const binding = req.cookies?.[SSO_BINDING_COOKIE] as string | undefined
    if (!code || typeof code !== 'string') throw AppError.badRequest('Missing authorization code')
    if (!binding || typeof binding !== 'string') throw AppError.badRequest('Missing SSO binding')

    const clearSsoCookies = () => {
      const opts = {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path:     '/api/auth/sso/exchange',
      }
      res.clearCookie(SSO_PENDING_COOKIE, opts)
      res.clearCookie(SSO_BINDING_COOKIE, opts)
    }

    // Clear both pending cookies immediately so they cannot be reused even on error.
    clearSsoCookies()

    // Atomically retrieve and delete the code (single-use).
    let storedRaw: string | null
    try {
      storedRaw = await redis.getdel(`sso:code:${code}`)
    } catch (err) {
      console.error('SSO exchange store unavailable (Redis):', (err as Error).message)
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }
    if (!storedRaw) throw AppError.unauthorized('Authorization code is invalid or expired')

    // Parse the stored payload and verify the binding nonce (Finding 6).
    let stored: { userId: string; binding: string }
    try {
      stored = JSON.parse(storedRaw) as { userId: string; binding: string }
    } catch {
      throw AppError.unauthorized('Authorization code is malformed')
    }
    if (!stored.binding || stored.binding !== binding) {
      throw AppError.unauthorized('SSO binding mismatch — possible login-CSRF attempt')
    }
    const userId = stored.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw AppError.unauthorized('User not found')

    // Verify the user still holds an active entitlement from the portal before
    // issuing any session credential. Consistent with the standard login path.
    await requireCentralEntitlement(PRODUCT_ID, user.email)

    const productRole = await prisma.userProductRole.findUnique({
      where: { userId_product: { userId: user.id, product: PRODUCT_ID } },
    })

    const authPayload: AuthPayload = {
      userId:        user.id,
      email:         user.email,
      role:          productRole?.role ?? 'LECTURER',
      institutionId: user.institutionId ?? null,
      roleSlug:      (productRole?.role ?? 'LECTURER') === 'STUDENT' ? 'student' : 'lecturer',
    }
    const accessToken  = signAccessToken(authPayload)
    const refreshToken = await createRefreshToken(user.id)

    // Refresh token goes into an HttpOnly cookie — never in the response body.
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS)
    res.json({ status: 'success', tokens: { accessToken } })
  }),
}
