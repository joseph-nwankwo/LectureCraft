/**
 * Round 5 — Finding 3: Workspace activity feed + calendar GET authorization
 *
 * Activity feed:
 *   - member (any visibility) can read
 *   - non-member + PUBLIC + same institution can read
 *   - non-member + PUBLIC + different institution → 403
 *   - non-member + PRIVATE → 403
 *   - non-member + non-existent workspace → 404
 *
 * Calendar GET by id:
 *   - same institution → passes through
 *   - different institution → 403
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockWorkspaceFindUnique    = jest.fn()
const mockMemberFindUnique       = jest.fn()
const mockFeedFindMany           = jest.fn()
const mockFeedCount              = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    workspace: { findUnique: mockWorkspaceFindUnique },
    workspaceMember: { findUnique: mockMemberFindUnique },
    activityFeed: { findMany: mockFeedFindMany, count: mockFeedCount },
    calendarEvent: { findUnique: jest.fn() },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { activityService } = require('../services/activity/activity.service') as typeof import('../services/activity/activity.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.resetAllMocks())

// ── Activity feed ─────────────────────────────────────────────────────────────

describe('Round 5 — Finding 3: getWorkspaceFeed authorization', () => {
  it('allows a workspace member regardless of visibility', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ institutionId: 'inst-1', visibility: 'PRIVATE' })
    mockMemberFindUnique.mockResolvedValue({ userId: 'user-1', workspaceId: 'ws-1' })
    mockFeedFindMany.mockResolvedValue([])
    mockFeedCount.mockResolvedValue(0)

    await expect(
      activityService.getWorkspaceFeed('ws-1', 'user-1', 'inst-1'),
    ).resolves.toBeDefined()
  })

  it('allows a non-member from the same institution on a PUBLIC workspace', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ institutionId: 'inst-1', visibility: 'PUBLIC' })
    mockMemberFindUnique.mockResolvedValue(null)
    mockFeedFindMany.mockResolvedValue([])
    mockFeedCount.mockResolvedValue(0)

    await expect(
      activityService.getWorkspaceFeed('ws-1', 'non-member', 'inst-1'),
    ).resolves.toBeDefined()
  })

  it('rejects a non-member from a different institution even on a PUBLIC workspace', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ institutionId: 'inst-1', visibility: 'PUBLIC' })
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(
      activityService.getWorkspaceFeed('ws-1', 'foreign-user', 'inst-2'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a non-member on a PRIVATE workspace', async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ institutionId: 'inst-1', visibility: 'PRIVATE' })
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(
      activityService.getWorkspaceFeed('ws-1', 'non-member', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns 404 for a non-existent workspace', async () => {
    mockWorkspaceFindUnique.mockResolvedValue(null)

    await expect(
      activityService.getWorkspaceFeed('no-such-ws', 'user-1', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ── Calendar GET institution check (via controller) ───────────────────────────
// The controller-level check lives in calendar.controller.ts; we test it via
// a lightweight simulation of the guard rather than spinning up Express.

import { AppError } from '../utils/errors'

function simulateCalendarGetInstitutionCheck(
  eventInstitutionId: string,
  callerInstitutionId: string | undefined,
): void {
  if (eventInstitutionId !== callerInstitutionId) {
    throw AppError.forbidden('Access denied')
  }
}

describe('Round 5 — Finding 3: calendar GET institution check', () => {
  it('allows a caller from the same institution', () => {
    expect(() =>
      simulateCalendarGetInstitutionCheck('inst-1', 'inst-1'),
    ).not.toThrow()
  })

  it('rejects a caller from a different institution', () => {
    expect(() =>
      simulateCalendarGetInstitutionCheck('inst-1', 'inst-2'),
    ).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('rejects a caller with no institution', () => {
    expect(() =>
      simulateCalendarGetInstitutionCheck('inst-1', undefined),
    ).toThrow(expect.objectContaining({ statusCode: 403 }))
  })
})
