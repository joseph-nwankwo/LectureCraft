/**
 * CVE-LS-001 / CVE-LS-002 Regression Tests — Socket.IO Membership Authorization
 *
 * Verifies that:
 * - conversation:join requires ConversationMember record
 * - workspace:join requires WorkspaceMember record or PUBLIC workspace in same institution
 * - message:read checks membership before writing a read receipt
 * - Non-members receive error events, not room access
 * - Cross-institution workspace joins are rejected
 */

import jwt from 'jsonwebtoken'

// ── Environment setup ─────────────────────────────────────────────────────────
const JWT_ACCESS_SECRET = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_ACCESS_SECRET               = JWT_ACCESS_SECRET
process.env.JWT_REFRESH_SECRET              = 'test-jwt-refresh-secret-min-32-chars!!'
process.env.DATABASE_URL                    = 'postgresql://test:test@localhost:5432/test'
process.env.CRAFT_LAUNCH_SECRET             = 'test-craft-launch-secret-min-32-chars-!!!'
process.env.COOKIE_SECRET                   = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL         = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-entitlement-service-secret-min-32-chars'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockConversationMember = jest.fn()
const mockWorkspaceMember    = jest.fn()
const mockWorkspaceFind      = jest.fn()
const mockMarkRead           = jest.fn()
const mockPresenceHeartbeat  = jest.fn().mockResolvedValue(undefined)
const mockPresenceSetOffline = jest.fn().mockResolvedValue(undefined)
const mockPresenceSweep      = jest.fn().mockResolvedValue(undefined)

jest.mock('../config/database', () => ({
  prisma: {
    conversationMember: { findUnique: mockConversationMember },
    workspaceMember:    { findUnique: mockWorkspaceMember },
    workspace:          { findUnique: mockWorkspaceFind },
  },
}))

jest.mock('../services/presence/presence.service', () => ({
  presenceService: {
    heartbeat:   mockPresenceHeartbeat,
    setPresence: jest.fn().mockResolvedValue(undefined),
    setOffline:  mockPresenceSetOffline,
    sweepStale:  mockPresenceSweep,
  },
}))

jest.mock('../services/messaging/message.service', () => ({ messageService: {} }))

jest.mock('../services/messaging/conversation.service', () => ({
  conversationService: { markRead: mockMarkRead },
}))

jest.mock('../config/redis', () => ({ redis: { set: jest.fn(), getdel: jest.fn() } }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    { userId: 'user-1', email: 'a@test.com', role: 'LECTURER', institutionId: 'inst-1', roleSlug: 'lecturer', ...overrides },
    JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  )
}

// Import gateway after mocks are registered
/* eslint-disable @typescript-eslint/no-require-imports */
const { createSocketGateway } = require('../gateway/socket.gateway') as typeof import('../gateway/socket.gateway')
/* eslint-enable @typescript-eslint/no-require-imports */

import http from 'http'
import { io as ioc, Socket as ClientSocket } from 'socket.io-client'

function createServer(): http.Server {
  const srv = http.createServer()
  createSocketGateway(srv)
  return srv
}

function connect(srv: http.Server, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const port = (srv.address() as { port: number }).port
    const sock = ioc(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
    })
    sock.on('connect', () => resolve(sock))
    sock.on('connect_error', reject)
  })
}

/**
 * Emits `sendEvent` with `data` and resolves when `awaitEvent` arrives from the server.
 * Rejects after 5 s to prevent hanging tests.
 */
function req<T = unknown>(
  socket: ClientSocket,
  sendEvent: string,
  data: unknown,
  awaitEvent: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${awaitEvent}"`)), 5000)
    socket.once(awaitEvent, (payload) => {
      clearTimeout(timer)
      resolve(payload as T)
    })
    socket.emit(sendEvent, data)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CVE-LS-001: conversation:join membership enforcement', () => {
  let srv: http.Server

  beforeEach(() => {
    srv = createServer()
  })

  afterEach((done) => {
    srv.close(done)
    jest.clearAllMocks()
  })

  it('allows join when ConversationMember record exists', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockConversationMember.mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'user-1' })

    const client = await connect(srv, makeToken())
    const result = await req<{ conversationId: string }>(
      client, 'conversation:join', { conversationId: 'conv-1' }, 'conversation:joined'
    )

    expect(result.conversationId).toBe('conv-1')
    client.disconnect()
  })

  it('rejects join with NOT_MEMBER error when no ConversationMember record', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockConversationMember.mockResolvedValueOnce(null)

    const client = await connect(srv, makeToken())
    const error  = await req<{ code: string }>(
      client, 'conversation:join', { conversationId: 'conv-secret' }, 'error'
    )

    expect(error.code).toBe('NOT_MEMBER')
    client.disconnect()
  })

  it('rejects join when DB throws (fails closed)', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockConversationMember.mockRejectedValueOnce(new Error('DB timeout'))

    const client = await connect(srv, makeToken())
    const error  = await req<{ code: string }>(
      client, 'conversation:join', { conversationId: 'conv-1' }, 'error'
    )

    expect(error.code).toBe('NOT_MEMBER')
    client.disconnect()
  })
})

describe('CVE-LS-001: workspace:join membership enforcement', () => {
  let srv: http.Server

  beforeEach(() => { srv = createServer() })
  afterEach((done) => { srv.close(done); jest.clearAllMocks() })

  it('allows join when WorkspaceMember record exists', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockWorkspaceMember.mockResolvedValueOnce({ workspaceId: 'ws-1', userId: 'user-1' })
    mockWorkspaceFind.mockResolvedValueOnce({ institutionId: 'inst-1', visibility: 'PRIVATE' })

    const client = await connect(srv, makeToken())
    const result = await req<{ workspaceId: string }>(
      client, 'workspace:join', { workspaceId: 'ws-1' }, 'workspace:joined'
    )

    expect(result.workspaceId).toBe('ws-1')
    client.disconnect()
  })

  it('allows join for PUBLIC workspace in same institution even without WorkspaceMember record', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockWorkspaceMember.mockResolvedValueOnce(null)
    mockWorkspaceFind.mockResolvedValueOnce({ institutionId: 'inst-1', visibility: 'PUBLIC' })

    const client = await connect(srv, makeToken({ institutionId: 'inst-1' }))
    const result = await req<{ workspaceId: string }>(
      client, 'workspace:join', { workspaceId: 'ws-public' }, 'workspace:joined'
    )

    expect(result.workspaceId).toBe('ws-public')
    client.disconnect()
  })

  it('rejects join for PUBLIC workspace when user is in a DIFFERENT institution (cross-institution)', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockWorkspaceMember.mockResolvedValueOnce(null)
    mockWorkspaceFind.mockResolvedValueOnce({ institutionId: 'inst-B', visibility: 'PUBLIC' })

    const client = await connect(srv, makeToken({ institutionId: 'inst-A' }))
    const error  = await req<{ code: string }>(
      client, 'workspace:join', { workspaceId: 'ws-other-inst' }, 'error'
    )

    expect(error.code).toBe('NOT_MEMBER')
    client.disconnect()
  })

  it('rejects join for PRIVATE workspace without WorkspaceMember record', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockWorkspaceMember.mockResolvedValueOnce(null)
    mockWorkspaceFind.mockResolvedValueOnce({ institutionId: 'inst-1', visibility: 'PRIVATE' })

    const client = await connect(srv, makeToken())
    const error  = await req<{ code: string }>(
      client, 'workspace:join', { workspaceId: 'ws-private' }, 'error'
    )

    expect(error.code).toBe('NOT_MEMBER')
    client.disconnect()
  })

  it('rejects join when workspace does not exist', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockWorkspaceMember.mockResolvedValueOnce(null)
    mockWorkspaceFind.mockResolvedValueOnce(null)

    const client = await connect(srv, makeToken())
    const error  = await req<{ code: string }>(
      client, 'workspace:join', { workspaceId: 'ws-nonexistent' }, 'error'
    )

    expect(error.code).toBe('NOT_FOUND')
    client.disconnect()
  })
})

describe('CVE-LS-002: message:read membership enforcement', () => {
  let srv: http.Server

  beforeEach(() => { srv = createServer() })
  afterEach((done) => { srv.close(done); jest.clearAllMocks() })

  it('calls markRead only when ConversationMember record exists', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockConversationMember.mockResolvedValue({ conversationId: 'conv-1', userId: 'user-1' })
    mockMarkRead.mockResolvedValue({})

    const client = await connect(srv, makeToken())
    client.emit('message:read', { conversationId: 'conv-1' })

    await new Promise((r) => setTimeout(r, 50))
    expect(mockMarkRead).toHaveBeenCalledWith('conv-1', 'user-1')
    client.disconnect()
  })

  it('does NOT call markRead when user is not a ConversationMember', async () => {
    await new Promise<void>((r) => srv.listen(0, r))
    mockConversationMember.mockResolvedValue(null)

    const client = await connect(srv, makeToken())
    client.emit('message:read', { conversationId: 'conv-secret' })

    await new Promise((r) => setTimeout(r, 50))
    expect(mockMarkRead).not.toHaveBeenCalled()
    client.disconnect()
  })
})
