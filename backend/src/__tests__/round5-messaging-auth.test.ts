/**
 * Round 5 — Finding 4: REST message.react() must check conversation membership
 *
 * - member can react (ConversationMember record present)
 * - non-member react → 403
 * - message not found → 404
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMessageFindUnique  = jest.fn()
const mockMemberFindUnique   = jest.fn()
const mockReactionFindUnique = jest.fn()
const mockReactionCreate     = jest.fn()
const mockReactionDelete     = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    message: { findUnique: mockMessageFindUnique },
    conversationMember: { findUnique: mockMemberFindUnique },
    messageReaction: {
      findUnique: mockReactionFindUnique,
      create:     mockReactionCreate,
      delete:     mockReactionDelete,
    },
    conversation: { update: jest.fn() },
    mention:      { createMany: jest.fn() },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { messageService } = require('../services/messaging/message.service') as typeof import('../services/messaging/message.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.resetAllMocks())

describe('Round 5 — Finding 4: messageService.react() membership check', () => {
  it('returns 404 when the message does not exist', async () => {
    mockMessageFindUnique.mockResolvedValue(null)

    await expect(
      messageService.react('non-existent-msg', 'user-1', '👍'),
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(mockMemberFindUnique).not.toHaveBeenCalled()
  })

  it('rejects a non-member with 403', async () => {
    mockMessageFindUnique.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' })
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(
      messageService.react('msg-1', 'non-member', '👍'),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockReactionFindUnique).not.toHaveBeenCalled()
  })

  it('allows a member to add a reaction', async () => {
    mockMessageFindUnique.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' })
    mockMemberFindUnique.mockResolvedValue({ userId: 'user-1', conversationId: 'conv-1' })
    mockReactionFindUnique.mockResolvedValue(null) // no existing reaction → will create
    mockReactionCreate.mockResolvedValue({ id: 'r1', emoji: '👍' })

    const result = await messageService.react('msg-1', 'user-1', '👍')

    expect(result).toMatchObject({ action: 'added', emoji: '👍' })
    expect(mockReactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ messageId: 'msg-1', userId: 'user-1', emoji: '👍' }) }),
    )
  })

  it('allows a member to toggle (remove) an existing reaction', async () => {
    mockMessageFindUnique.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-1' })
    mockMemberFindUnique.mockResolvedValue({ userId: 'user-1', conversationId: 'conv-1' })
    mockReactionFindUnique.mockResolvedValue({ id: 'r-existing', emoji: '👍' })
    mockReactionDelete.mockResolvedValue({ id: 'r-existing' })

    const result = await messageService.react('msg-1', 'user-1', '👍')

    expect(result).toMatchObject({ action: 'removed', emoji: '👍' })
    expect(mockReactionDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r-existing' } }),
    )
  })

  it('verifies the membership check uses the correct composite key', async () => {
    mockMessageFindUnique.mockResolvedValue({ id: 'msg-1', conversationId: 'conv-42' })
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(
      messageService.react('msg-1', 'user-99', '🔥'),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockMemberFindUnique).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: 'conv-42', userId: 'user-99' } },
    })
  })
})
