/**
 * Round 3 — Finding 4: Workspace REST membership checks
 *
 * Verifies that get, getDashboard, and getMembers return 403 when the caller
 * has no membership and the workspace is PRIVATE.
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'

const mockWsFindUnique       = jest.fn()
const mockMemberFindUnique   = jest.fn()
const mockMemberCount        = jest.fn()
const mockMemberFindMany     = jest.fn()
const mockActivityFindMany   = jest.fn()
const mockCalendarFindMany   = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    workspace: {
      findUnique: mockWsFindUnique,
    },
    workspaceMember: {
      findUnique: mockMemberFindUnique,
      count:      mockMemberCount,
      findMany:   mockMemberFindMany,
    },
    activityFeed: {
      findMany: mockActivityFindMany,
    },
    calendarEvent: {
      findMany: mockCalendarFindMany,
    },
    user: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { workspaceService } = require('../services/workspace/workspace.service') as typeof import('../services/workspace/workspace.service')
/* eslint-enable @typescript-eslint/no-require-imports */

const PRIVATE_WS = { id: 'ws-1', visibility: 'PRIVATE', institutionId: 'inst-1', ownerId: 'owner-1' }

beforeEach(() => {
  jest.clearAllMocks()
  mockMemberCount.mockResolvedValue(5)
  mockMemberFindMany.mockResolvedValue([])
  mockActivityFindMany.mockResolvedValue([])
  mockCalendarFindMany.mockResolvedValue([])
})

describe('Finding 4: workspaceService.get', () => {
  it('throws 403 for non-member on PRIVATE workspace', async () => {
    mockWsFindUnique.mockResolvedValue(PRIVATE_WS)
    mockMemberFindUnique.mockResolvedValue(null) // not a member

    await expect(workspaceService.get('ws-1', 'stranger')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a member to access a PRIVATE workspace', async () => {
    mockWsFindUnique
      .mockResolvedValueOnce(PRIVATE_WS)  // requireAccess check
      .mockResolvedValueOnce({ ...PRIVATE_WS, owner: { id: 'owner-1', name: 'Owner', avatarUrl: null }, _count: { members: 5, conversations: 2 } })
    mockMemberFindUnique.mockResolvedValue({ workspaceId: 'ws-1', userId: 'member-1', role: 'MEMBER' })

    await expect(workspaceService.get('ws-1', 'member-1')).resolves.toBeDefined()
  })

  it('allows any authenticated user to access a PUBLIC workspace', async () => {
    const pubWs = { ...PRIVATE_WS, visibility: 'PUBLIC' }
    mockWsFindUnique
      .mockResolvedValueOnce(pubWs)  // requireAccess — returns early for PUBLIC
      .mockResolvedValueOnce({ ...pubWs, owner: { id: 'owner-1', name: 'Owner', avatarUrl: null }, _count: { members: 5, conversations: 2 } })

    await expect(workspaceService.get('ws-1', 'stranger')).resolves.toBeDefined()
  })
})

describe('Finding 4: workspaceService.getDashboard', () => {
  it('throws 403 for non-member on PRIVATE workspace', async () => {
    mockWsFindUnique.mockResolvedValue(PRIVATE_WS)
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(workspaceService.getDashboard('ws-1', 'stranger')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('succeeds for a member', async () => {
    mockWsFindUnique
      .mockResolvedValueOnce(PRIVATE_WS)  // requireAccess
      .mockResolvedValueOnce({ ...PRIVATE_WS, owner: {} })  // dashboard query
    mockMemberFindUnique.mockResolvedValue({ role: 'MEMBER' })

    await expect(workspaceService.getDashboard('ws-1', 'member-1')).resolves.toBeDefined()
  })
})

describe('Finding 4: workspaceService.getMembers', () => {
  it('throws 403 for non-member on PRIVATE workspace', async () => {
    mockWsFindUnique.mockResolvedValue(PRIVATE_WS)
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(workspaceService.getMembers('ws-1', 'stranger')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('succeeds for a member', async () => {
    mockWsFindUnique.mockResolvedValue(PRIVATE_WS)
    mockMemberFindUnique.mockResolvedValue({ role: 'MEMBER' })

    const result = await workspaceService.getMembers('ws-1', 'member-1')
    expect(result).toHaveProperty('items')
  })
})
