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
import type { AuthPayload } from '../middleware/auth.middleware'

const SSO_CODE_TTL_SECONDS = 60

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

    let avatarUrl: string
    if (isR2Configured()) {
      // Delete old R2 object when present
      if (existing?.avatarUrl && !existing.avatarUrl.startsWith('/uploads/')) {
        await deleteFromR2(existing.avatarUrl).catch(() => null)
      }
      avatarUrl = await uploadToR2('avatars', buffer, mimetype)
    } else {
      // Local-disk fallback — not suitable for production (ephemeral filesystem)
      const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars')
      fs.mkdirSync(uploadsDir, { recursive: true })
      if (existing?.avatarUrl?.startsWith('/uploads/avatars/')) {
        const oldPath = path.join(process.cwd(), existing.avatarUrl)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      const filename = `${userId}.${mimeToExt(mimetype)}`
      fs.writeFileSync(path.join(uploadsDir, filename), buffer)
      avatarUrl = `/uploads/avatars/${filename}`
    }

    const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl } })
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
    if (isR2Configured()) {
      if (existing?.personalInstitutionLogoUrl && !existing.personalInstitutionLogoUrl.startsWith('/uploads/')) {
        await deleteFromR2(existing.personalInstitutionLogoUrl).catch(() => null)
      }
      logoUrl = await uploadToR2('institution-logos', buffer, mimetype)
    } else {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'institution-logos')
      fs.mkdirSync(uploadsDir, { recursive: true })
      if (existing?.personalInstitutionLogoUrl?.startsWith('/uploads/institution-logos/')) {
        const oldPath = path.join(process.cwd(), existing.personalInstitutionLogoUrl)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      const filename = `${userId}.${mimeToExt(mimetype)}`
      fs.writeFileSync(path.join(uploadsDir, filename), buffer)
      logoUrl = `/uploads/institution-logos/${filename}`
    }

    await prisma.user.update({ where: { id: userId }, data: { personalInstitutionLogoUrl: logoUrl } })
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
    // The code is exchanged for tokens by POST /api/auth/sso/exchange — keeping
    // both the access token and the refresh token out of the redirect URL and
    // therefore out of server access logs and browser history.
    const code = crypto.randomBytes(32).toString('hex')
    let codeStored: string | null
    try {
      codeStored = await redis.set(`sso:code:${code}`, user.id, 'EX', SSO_CODE_TTL_SECONDS, 'NX')
    } catch (err) {
      console.error('SSO code store unavailable (Redis):', (err as Error).message)
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }
    if (codeStored !== 'OK') {
      // Collision — astronomically unlikely with 32 random bytes, treat as server error
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }

    res.redirect(`${env.FRONTEND_URL}/auth/sso?code=${encodeURIComponent(code)}`)
  }),

  // ── SSO exchange — called by frontend to swap the auth code for tokens ───
  ssoExchange: asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body as { code?: string }
    if (!code || typeof code !== 'string') throw AppError.badRequest('Missing authorization code')

    // Atomically retrieve and delete the code (single-use).
    let userId: string | null
    try {
      userId = await redis.getdel(`sso:code:${code}`)
    } catch (err) {
      console.error('SSO exchange store unavailable (Redis):', (err as Error).message)
      throw new AppError('Single sign-on is temporarily unavailable', 503)
    }
    if (!userId) throw AppError.unauthorized('Authorization code is invalid or expired')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw AppError.unauthorized('User not found')

    const productRole = await prisma.userProductRole.findUnique({
      where: { userId_product: { userId: user.id, product: 'lecturesuite' } },
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
