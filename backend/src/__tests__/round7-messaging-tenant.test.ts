/**
 * Round 7 regression: messaging IDOR — markRead / muteConversation / archiveConversation
 *
 * Before Round 7, these operations called prisma.conversationMember.update()
 * directly, which throws P2025 (→ unhandled 500) for non-members instead of
 * returning a 403.  Round 7 adds an explicit membership check first.
 *
 * Tests:
 *   • Members:     operations succeed
 *   • Non-members: AppError.forbidden thrown before any update
 */

import { jest } from '@jest/globals'
import { AppError } from '../utils/errors'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn<() => Promise<Record<string, unknown> | null>>()
const mockUpdate     = jest.fn<() => Promise<Record<string, unknown>>>()

const mockPrisma = {
  conversationMember: {
    findUnique: mockFindUnique,
    update:     mockUpdate,
  },
}

jest.mock('../config/database', () => ({ prisma: mockPrisma }))

// ── Import service after mock ─────────────────────────────────────────────────

import { conversationService } from '../services/messaging/conversation.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONV_ID = 'conv-1'
const USER_ID = 'user-1'

const memberRecord = { conversationId: CONV_ID, userId: USER_ID, muted: false, archived: false }

function setupMember()    { mockFindUnique.mockResolvedValue(memberRecord) }
function setupNonMember() { mockFindUnique.mockResolvedValue(null) }

// ── markRead ──────────────────────────────────────────────────────────────────

describe('conversationService.markRead (Round 7 Finding 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue(memberRecord)
  })

  it('succeeds for a member', async () => {
    setupMember()
    await expect(conversationService.markRead(CONV_ID, USER_ID)).resolves.toBeDefined()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('throws 403 for a non-member without calling update', async () => {
    setupNonMember()
    await expect(conversationService.markRead(CONV_ID, USER_ID)).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('queries membership with the correct composite key', async () => {
    setupMember()
    await conversationService.markRead(CONV_ID, USER_ID)
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: CONV_ID, userId: USER_ID } },
    })
  })
})

// ── muteConversation ──────────────────────────────────────────────────────────

describe('conversationService.muteConversation (Round 7 Finding 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue(memberRecord)
  })

  it('succeeds (mute=true) for a member', async () => {
    setupMember()
    await expect(conversationService.muteConversation(CONV_ID, USER_ID, true)).resolves.toBeDefined()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('succeeds (mute=false) for a member', async () => {
    setupMember()
    await expect(conversationService.muteConversation(CONV_ID, USER_ID, false)).resolves.toBeDefined()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('throws 403 for a non-member without calling update', async () => {
    setupNonMember()
    await expect(conversationService.muteConversation(CONV_ID, USER_ID, true)).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

// ── archiveConversation ───────────────────────────────────────────────────────

describe('conversationService.archiveConversation (Round 7 Finding 6)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue(memberRecord)
  })

  it('succeeds (archive=true) for a member', async () => {
    setupMember()
    await expect(conversationService.archiveConversation(CONV_ID, USER_ID, true)).resolves.toBeDefined()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('succeeds (archive=false) for a member', async () => {
    setupMember()
    await expect(conversationService.archiveConversation(CONV_ID, USER_ID, false)).resolves.toBeDefined()
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('throws 403 for a non-member without calling update', async () => {
    setupNonMember()
    await expect(conversationService.archiveConversation(CONV_ID, USER_ID, true)).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('error message indicates membership is required', async () => {
    setupNonMember()
    await expect(conversationService.archiveConversation(CONV_ID, USER_ID, true)).rejects.toMatchObject({
      message: expect.stringContaining('member'),
    })
  })
})
