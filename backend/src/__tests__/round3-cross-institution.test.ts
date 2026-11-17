/**
 * Round 3 — Finding 3: Cross-institution membership security
 *
 * Verifies:
 * - getOrCreateDirect rejects a targetUserId from a different institution
 * - createGroup rejects memberIds containing cross-institution users
 * - addMembers in conversation rejects cross-institution users
 * - workspace addMember rejects cross-institution target user
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'

const mockUserFindMany          = jest.fn()
const mockConvFindFirst         = jest.fn()
const mockConvCreate            = jest.fn()
const mockMemberFindMany        = jest.fn()
const mockMemberCreateMany      = jest.fn()
const mockWsFindUnique          = jest.fn()
const mockWsMemberFindUnique    = jest.fn()
const mockUserFindUnique        = jest.fn()
const mockWsMemberCreate        = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findMany:  mockUserFindMany,
      findUnique: mockUserFindUnique,
    },
    conversation: {
      findFirst: mockConvFindFirst,
      create:    mockConvCreate,
    },
    conversationMember: {
      findMany:    mockMemberFindMany,
      createMany:  mockMemberCreateMany,
    },
    workspace: {
      findUnique: mockWsFindUnique,
    },
    workspaceMember: {
      findUnique: mockWsMemberFindUnique,
      create:     mockWsMemberCreate,
    },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { conversationService } = require('../services/messaging/conversation.service') as typeof import('../services/messaging/conversation.service')
const { workspaceService }    = require('../services/workspace/workspace.service') as typeof import('../services/workspace/workspace.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.resetAllMocks())

// ── Conversation service ──────────────────────────────────────────────────────

describe('Finding 3: conversationService.getOrCreateDirect', () => {
  it('rejects when target user is from a different institution', async () => {
    // Target belongs to 'inst-2', caller is 'inst-1'
    mockUserFindMany.mockResolvedValue([{ id: 'target-user', institutionId: 'inst-2' }])

    await expect(
      conversationService.getOrCreateDirect('inst-1', 'actor', 'target-user')
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockConvFindFirst).not.toHaveBeenCalled()
    expect(mockConvCreate).not.toHaveBeenCalled()
  })

  it('allows target user from the same institution', async () => {
    mockUserFindMany.mockResolvedValue([{ id: 'target-user', institutionId: 'inst-1' }])
    mockConvFindFirst.mockResolvedValue(null)
    mockConvCreate.mockResolvedValue({ id: 'conv-1', members: [] })

    await expect(
      conversationService.getOrCreateDirect('inst-1', 'actor', 'target-user')
    ).resolves.toBeDefined()
  })
})

describe('Finding 3: conversationService.createGroup', () => {
  it('rejects when any memberIds belong to a different institution', async () => {
    mockUserFindMany.mockResolvedValue([
      { id: 'member-1', institutionId: 'inst-1' },
      { id: 'member-2', institutionId: 'inst-2' },  // outsider
    ])

    await expect(
      conversationService.createGroup('inst-1', 'creator', {
        name: 'Group Chat', memberIds: ['member-1', 'member-2'],
      })
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockConvCreate).not.toHaveBeenCalled()
  })
})

describe('Finding 3: conversationService.addMembers', () => {
  it('rejects cross-institution addition', async () => {
    // Conv exists and actor is a member; conv has institutionId 'inst-1'
    mockConvFindFirst.mockResolvedValue({ id: 'conv-1', type: 'GROUP', institutionId: 'inst-1' })
    // Target user is from 'inst-2'
    mockUserFindMany.mockResolvedValue([{ id: 'outsider', institutionId: 'inst-2' }])

    await expect(
      conversationService.addMembers('conv-1', 'actor', ['outsider'])
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockMemberCreateMany).not.toHaveBeenCalled()
  })
})

// ── Workspace service ─────────────────────────────────────────────────────────

describe('Finding 3: workspaceService.addMember', () => {
  it('rejects when target user institution does not match workspace institution', async () => {
    // Actor is an admin
    mockWsMemberFindUnique
      .mockResolvedValueOnce({ role: 'ADMIN', workspaceId: 'ws-1', userId: 'admin-1' })   // requireAdmin
      .mockResolvedValueOnce(null)                                                           // existing member check

    mockWsFindUnique.mockResolvedValue({ id: 'ws-1', institutionId: 'inst-1' })
    mockUserFindUnique.mockResolvedValue({ id: 'outsider', institutionId: 'inst-2' })

    await expect(
      workspaceService.addMember('ws-1', 'admin-1', 'outsider')
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockWsMemberCreate).not.toHaveBeenCalled()
  })

  it('allows adding a user from the same institution', async () => {
    mockWsMemberFindUnique
      .mockResolvedValueOnce({ role: 'ADMIN', workspaceId: 'ws-1', userId: 'admin-1' })
      .mockResolvedValueOnce(null)

    mockWsFindUnique.mockResolvedValue({ id: 'ws-1', institutionId: 'inst-1' })
    mockUserFindUnique.mockResolvedValue({ id: 'new-member', institutionId: 'inst-1' })
    mockWsMemberCreate.mockResolvedValue({ workspaceId: 'ws-1', userId: 'new-member', role: 'MEMBER' })

    await expect(
      workspaceService.addMember('ws-1', 'admin-1', 'new-member')
    ).resolves.toBeDefined()
  })
})
