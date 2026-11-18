/**
 * Round 7 regression: workspace member revocation
 *
 * Verifies that removing a user from a workspace:
 *   1. Removes ConversationMember records for workspace-scoped conversations only
 *   2. Emits workspace:removed to the ejected user's socket room
 *   3. Calls socketsLeave on workspace:<id> room
 *   4. Calls ejectUserFromConversation only for workspace-scoped conversations
 *   5. Still removes DB membership even when io is null (fail-closed)
 */

import { jest } from '@jest/globals'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockDeleteMany   = jest.fn<() => Promise<{ count: number }>>().mockResolvedValue({ count: 1 })
const mockFindMany     = jest.fn<() => Promise<{ id: string }[]>>()
const mockPrisma = {
  conversationMember: { deleteMany: mockDeleteMany },
  conversation:       { findMany:   mockFindMany  },
}

jest.mock('../config/database', () => ({ prisma: mockPrisma }))

// ── Socket mock ───────────────────────────────────────────────────────────────

const mockSocketsLeave = jest.fn<() => void>()
const mockEmit         = jest.fn<() => void>()
const mockEject        = jest.fn<() => void>()

const mockIo = {
  in:  jest.fn<() => { socketsLeave: typeof mockSocketsLeave }>().mockReturnValue({ socketsLeave: mockSocketsLeave }),
  to:  jest.fn<() => { emit: typeof mockEmit }>().mockReturnValue({ emit: mockEmit }),
}

jest.mock('../gateway/socket.gateway', () => ({
  getGatewayIo:              jest.fn(() => mockIo),
  ejectUserFromConversation: mockEject,
}))

// ── Workspace service mock (remove member succeeds) ───────────────────────────

jest.mock('../services/workspace/workspace.service', () => ({
  workspaceService: {
    removeMember: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  },
}))

// ── Import controller after mocks ─────────────────────────────────────────────

import { workspaceController } from '../controllers/workspace/workspace.controller'

// asyncHandler doesn't return the inner Promise, so we signal completion via
// res.json being called (the last thing the handler does on success).
function makeReqRes(params: Record<string, string>) {
  let resolveJson!: () => void
  const jsonCalled = new Promise<void>((r) => { resolveJson = r })

  const json   = jest.fn<() => void>().mockImplementation(() => { resolveJson() })
  const status = jest.fn<() => { json: typeof json }>().mockReturnValue({ json })

  const res = { json, status }
  const req = {
    params,
    body: {},
    user: { userId: 'admin-1', institutionId: 'inst-1', role: 'LECTURER' },
  }
  return { req, res, jsonCalled }
}

async function invokeRemoveMember(workspaceId: string, targetUserId: string) {
  const { req, res, jsonCalled } = makeReqRes({ id: workspaceId, userId: targetUserId })
  workspaceController.removeMember(req as never, res as never, jest.fn())
  await jsonCalled
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('workspace member revocation (Round 7 Finding 3)', () => {
  const workspaceId  = 'ws-1'
  const targetUserId = 'user-99'

  beforeEach(() => {
    jest.clearAllMocks()
    mockFindMany.mockResolvedValue([{ id: 'conv-ws-1' }, { id: 'conv-ws-2' }])
    // Restore default io mock after any test that overrides it
    const { getGatewayIo } = jest.requireMock('../gateway/socket.gateway') as { getGatewayIo: jest.Mock }
    getGatewayIo.mockImplementation(() => mockIo)
  })

  it('deletes ConversationMember rows for workspace-scoped conversations only', async () => {
    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: {
        userId: targetUserId,
        conversation: { workspaceId },
      },
    })
  })

  it('queries conversations filtered by workspaceId before ejecting from rooms', async () => {
    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { workspaceId },
      select: { id: true },
    })
  })

  it('ejects the removed user from each workspace-scoped conversation room', async () => {
    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockEject).toHaveBeenCalledTimes(2)
    expect(mockEject).toHaveBeenCalledWith(mockIo, targetUserId, 'conv-ws-1')
    expect(mockEject).toHaveBeenCalledWith(mockIo, targetUserId, 'conv-ws-2')
  })

  it('removes the user from the workspace socket room', async () => {
    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockIo.in).toHaveBeenCalledWith(`user:${targetUserId}`)
    expect(mockSocketsLeave).toHaveBeenCalledWith(`workspace:${workspaceId}`)
  })

  it('emits workspace:removed to the removed user', async () => {
    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockIo.to).toHaveBeenCalledWith(`user:${targetUserId}`)
    expect(mockEmit).toHaveBeenCalledWith('workspace:removed', { workspaceId })
  })

  it('still removes DB membership when io is null (fail-closed)', async () => {
    const { getGatewayIo } = jest.requireMock('../gateway/socket.gateway') as { getGatewayIo: jest.Mock }
    getGatewayIo.mockReturnValue(null)

    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockDeleteMany).toHaveBeenCalled()
    expect(mockEject).not.toHaveBeenCalled()
    expect(mockSocketsLeave).not.toHaveBeenCalled()
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('ejects only from workspace-scoped conversations, not independent ones', async () => {
    mockFindMany.mockResolvedValueOnce([{ id: 'conv-ws-only' }])

    await invokeRemoveMember(workspaceId, targetUserId)

    expect(mockEject).toHaveBeenCalledTimes(1)
    expect(mockEject).toHaveBeenCalledWith(mockIo, targetUserId, 'conv-ws-only')
  })
})
