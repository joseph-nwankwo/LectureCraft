/**
 * Finding B Regression Tests — Socket.IO message:react and typing indicators
 *
 * Verifies that:
 * - message:react checks ConversationMember before reacting/broadcasting
 * - typing:start checks ConversationMember before broadcasting
 * - typing:stop  checks ConversationMember before broadcasting
 * - Non-members receive error events (message:react) or silent drops (typing)
 *   rather than cross-conversation data
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
const mockMessageFindUnique  = jest.fn()
const mockMessageReact       = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    conversationMember: { findUnique: mockConversationMember },
    workspaceMember:    { findUnique: jest.fn() },
    workspace:          { findUnique: jest.fn() },
    message:            { findUnique: mockMessageFindUnique },
  },
}))

jest.mock('../services/presence/presence.service', () => ({
  presenceService: {
    heartbeat:   jest.fn().mockResolvedValue(undefined),
    setPresence: jest.fn().mockResolvedValue(undefined),
    setOffline:  jest.fn().mockResolvedValue(undefined),
    sweepStale:  jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../services/messaging/message.service', () => ({
  messageService: {
    react: mockMessageReact,
  },
}))

jest.mock('../services/messaging/conversation.service', () => ({
  conversationService: { markRead: jest.fn() },
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

// ── message:react membership enforcement ──────────────────────────────────────

describe('Finding B: message:react membership enforcement', () => {
  let srv: http.Server

  beforeEach(() => { srv = createServer() })
  afterEach((done) => { srv.close(done); jest.clearAllMocks() })

  it('allows react when user is a ConversationMember (broadcast reaches room)', async () => {
    await new Promise<void>(r => srv.listen(0, r))
    // First call: conversation:join; second call: message:react membership check
    mockConversationMember
      .mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'user-1' })
      .mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'user-1' })
    // message:react now also verifies the message belongs to the stated conversation
    mockMessageFindUnique.mockResolvedValueOnce({ conversationId: 'conv-1' })
    mockMessageReact.mockResolvedValueOnce({ action: 'added' })

    const client = await connect(srv, makeToken())
    // Join room so the io.to('conv:conv-1') broadcast reaches this client
    await req(client, 'conversation:join', { conversationId: 'conv-1' }, 'conversation:joined')

    const result = await req<{ messageId: string }>(
      client,
      'message:react',
      { messageId: 'msg-1', emoji: '👍', conversationId: 'conv-1' },
      'message:reaction',
    )

    expect(result.messageId).toBe('msg-1')
    expect(mockMessageReact).toHaveBeenCalledWith('msg-1', 'user-1', '👍')
    client.disconnect()
  })

  it('rejects react with NOT_MEMBER error when user has no ConversationMember record', async () => {
    await new Promise<void>(r => srv.listen(0, r))
    mockConversationMember.mockResolvedValueOnce(null)

    const client = await connect(srv, makeToken())
    const error  = await req<{ code: string }>(
      client,
      'message:react',
      { messageId: 'msg-1', emoji: '👍', conversationId: 'conv-secret' },
      'error',
    )

    expect(error.code).toBe('NOT_MEMBER')
    expect(mockMessageReact).not.toHaveBeenCalled()
    client.disconnect()
  })

  it('membership check uses the JWT userId, not a client-supplied value', async () => {
    await new Promise<void>(r => srv.listen(0, r))
    mockConversationMember.mockResolvedValueOnce(null)

    const client = await connect(srv, makeToken({ userId: 'jwt-user' }))
    await req<{ code: string }>(
      client,
      'message:react',
      { messageId: 'msg-1', emoji: '👍', conversationId: 'conv-1', userId: 'forged-user' },
      'error',
    )

    // Membership query must use the JWT userId
    expect(mockConversationMember).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId_userId: { conversationId: 'conv-1', userId: 'jwt-user' } },
      })
    )
    client.disconnect()
  })
})

// ── typing:start membership enforcement ───────────────────────────────────────

describe('Finding B: typing:start membership enforcement', () => {
  let srv: http.Server

  beforeEach(() => { srv = createServer() })
  afterEach((done) => { srv.close(done); jest.clearAllMocks() })

  it('does not broadcast typing:start when user is not a ConversationMember', async () => {
    await new Promise<void>(r => srv.listen(0, r))

    // Setup: member joins the room (first DB call), non-member is blocked (second DB call)
    mockConversationMember
      .mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'member' })  // for join
      .mockResolvedValueOnce(null)                                              // for non-member typing check

    const memberToken    = makeToken({ userId: 'member' })
    const nonMemberToken = makeToken({ userId: 'non-member' })

    const member    = await connect(srv, memberToken)
    const nonMember = await connect(srv, nonMemberToken)

    // Member joins the conversation room
    await req(member, 'conversation:join', { conversationId: 'conv-1' }, 'conversation:joined')

    let gotTyping = false
    member.on('typing:start', () => { gotTyping = true })

    // Non-member emits typing:start — should be silently dropped
    nonMember.emit('typing:start', { conversationId: 'conv-1' })
    await new Promise(r => setTimeout(r, 150))

    expect(gotTyping).toBe(false)
    member.disconnect()
    nonMember.disconnect()
  })

  it('broadcasts typing:start to room when user is a ConversationMember', async () => {
    await new Promise<void>(r => srv.listen(0, r))

    // Setup: both member1 (typing) and member2 (listener) have membership
    mockConversationMember
      .mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'member-2' })  // member2 joins
      .mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'member-1' })  // member1 typing check

    const member1Token = makeToken({ userId: 'member-1' })
    const member2Token = makeToken({ userId: 'member-2' })

    const member1 = await connect(srv, member1Token)
    const member2 = await connect(srv, member2Token)

    // Member2 joins so it can listen in the room
    await req(member2, 'conversation:join', { conversationId: 'conv-1' }, 'conversation:joined')

    const typingPromise = new Promise<{ userId: string }>(resolve => {
      member2.once('typing:start', resolve)
    })

    member1.emit('typing:start', { conversationId: 'conv-1' })

    const typingEvent = await typingPromise
    expect(typingEvent.userId).toBe('member-1')

    member1.disconnect()
    member2.disconnect()
  })
})

// ── typing:stop membership enforcement ────────────────────────────────────────

describe('Finding B: typing:stop membership enforcement', () => {
  let srv: http.Server

  beforeEach(() => { srv = createServer() })
  afterEach((done) => { srv.close(done); jest.clearAllMocks() })

  it('does not broadcast typing:stop when user is not a ConversationMember', async () => {
    await new Promise<void>(r => srv.listen(0, r))

    mockConversationMember
      .mockResolvedValueOnce({ conversationId: 'conv-1', userId: 'member' })  // for join
      .mockResolvedValueOnce(null)                                              // for non-member stop check

    const memberToken    = makeToken({ userId: 'member' })
    const nonMemberToken = makeToken({ userId: 'non-member' })

    const member    = await connect(srv, memberToken)
    const nonMember = await connect(srv, nonMemberToken)

    await req(member, 'conversation:join', { conversationId: 'conv-1' }, 'conversation:joined')

    let gotStop = false
    member.on('typing:stop', () => { gotStop = true })

    nonMember.emit('typing:stop', { conversationId: 'conv-1' })
    await new Promise(r => setTimeout(r, 150))

    expect(gotStop).toBe(false)
    member.disconnect()
    nonMember.disconnect()
  })
})
