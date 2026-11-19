/**
 * CAL-01 regression tests: calendar event institution isolation
 *
 * Before fix:
 *   update() and delete() checked only creatorId === userId, with no institution
 *   scope guard. A creator who moved institutions retained full update/delete
 *   authority over their former institution's events.
 *
 *   getEvents() OR branch `{ workspaceId: { not: null } }` exposed all workspace
 *   calendar events within the institution to every institution member regardless
 *   of workspace membership.
 *
 * After fix:
 *   update() and delete() verify event.institutionId === caller's institutionId
 *   BEFORE checking creator ownership. Institution mismatch → 403 immediately.
 *
 *   getEvents() workspace branch replaced with `{ workspaceId: { in: memberIds } }`
 *   where memberIds comes from a workspaceMember query for the calling user.
 */

import { jest } from '@jest/globals'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockFindUnique    = jest.fn<() => Promise<Record<string, unknown> | null>>()
const mockCalUpdate     = jest.fn<() => Promise<Record<string, unknown>>>()
const mockCalDelete     = jest.fn<() => Promise<Record<string, unknown>>>()
const mockCalFindMany   = jest.fn<() => Promise<Record<string, unknown>[]>>().mockResolvedValue([])
const mockWsMemberFindMany = jest.fn<() => Promise<{ workspaceId: string }[]>>().mockResolvedValue([])

const mockPrisma = {
  calendarEvent: {
    findUnique: mockFindUnique,
    update:     mockCalUpdate,
    delete:     mockCalDelete,
    findMany:   mockCalFindMany,
  },
  workspaceMember: {
    findMany: mockWsMemberFindMany,
  },
}

jest.mock('../config/database', () => ({ prisma: mockPrisma }))

import { calendarService } from '../services/calendar/calendar.service'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INST_A     = 'institution-alpha'
const INST_B     = 'institution-beta'
const CREATOR_ID = 'creator-1'
const OTHER_USER = 'other-user-99'
const EVT_ID     = 'event-xyz'
const WS_A       = 'workspace-alpha'
const WS_B       = 'workspace-beta'

function calEvent(overrides: Record<string, unknown> = {}) {
  return {
    id:            EVT_ID,
    institutionId: INST_A,
    creatorId:     CREATOR_ID,
    title:         'Team Standup',
    workspaceId:   null,
    attendees:     [],
    startAt:       new Date(),
    endAt:         new Date(),
    ...overrides,
  }
}

// ── update() ─────────────────────────────────────────────────────────────────

describe('calendarService.update() — CAL-01: institution isolation', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('same-institution creator can update their own event', async () => {
    mockFindUnique.mockResolvedValue(calEvent())
    mockCalUpdate.mockResolvedValue(calEvent({ title: 'Updated' }))

    await expect(
      calendarService.update(EVT_ID, CREATOR_ID, INST_A, { title: 'Updated' })
    ).resolves.toBeDefined()

    expect(mockCalUpdate).toHaveBeenCalled()
  })

  it('creator now in Institution B cannot update former Institution A event', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.update(EVT_ID, CREATOR_ID, INST_B, {}).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403 })
    expect(mockCalUpdate).not.toHaveBeenCalled()
  })

  it('institution mismatch is checked before creator authorization', async () => {
    // The caller IS the original creator, but their current institution is INST_B.
    // The institution check must fire first and reject — the creator check must not
    // be reached (it would pass if reached, masking the institution bypass).
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.update(EVT_ID, CREATOR_ID, INST_B, {}).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockCalUpdate).not.toHaveBeenCalled()
  })

  it('non-creator in the same institution is forbidden', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.update(EVT_ID, OTHER_USER, INST_A, {}).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403 })
    expect(err.message).toBe('Only the creator can update this event')
    expect(mockCalUpdate).not.toHaveBeenCalled()
  })

  it('null-institution caller cannot update an institution-owned event', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.update(EVT_ID, CREATOR_ID, null, {}).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockCalUpdate).not.toHaveBeenCalled()
  })

  it('returns 404 when the event does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(
      calendarService.update(EVT_ID, CREATOR_ID, INST_A, {})
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ── delete() ─────────────────────────────────────────────────────────────────

describe('calendarService.delete() — CAL-01: institution isolation', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('same-institution creator can delete their own event', async () => {
    mockFindUnique.mockResolvedValue(calEvent())
    mockCalDelete.mockResolvedValue(calEvent())

    await expect(
      calendarService.delete(EVT_ID, CREATOR_ID, INST_A)
    ).resolves.toBeDefined()

    expect(mockCalDelete).toHaveBeenCalled()
  })

  it('creator now in Institution B cannot delete former Institution A event', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.delete(EVT_ID, CREATOR_ID, INST_B).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403 })
    expect(mockCalDelete).not.toHaveBeenCalled()
  })

  it('institution mismatch is checked before creator authorization', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.delete(EVT_ID, CREATOR_ID, INST_B).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockCalDelete).not.toHaveBeenCalled()
  })

  it('non-creator in the same institution is forbidden', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.delete(EVT_ID, OTHER_USER, INST_A).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403 })
    expect(err.message).toBe('Only the creator can delete this event')
    expect(mockCalDelete).not.toHaveBeenCalled()
  })

  it('null-institution caller cannot delete an institution-owned event', async () => {
    mockFindUnique.mockResolvedValue(calEvent({ institutionId: INST_A, creatorId: CREATOR_ID }))

    const err = await calendarService.delete(EVT_ID, CREATOR_ID, null).catch((e) => e)

    expect(err).toMatchObject({ statusCode: 403, message: 'Access denied' })
    expect(mockCalDelete).not.toHaveBeenCalled()
  })

  it('returns 404 when the event does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(
      calendarService.delete(EVT_ID, CREATOR_ID, INST_A)
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

// ── getEvents() workspace branch ──────────────────────────────────────────────

describe('calendarService.getEvents() — CAL-01: workspace membership enforcement', () => {
  beforeEach(() => { jest.clearAllMocks(); mockCalFindMany.mockResolvedValue([]) })

  // Helper: extract the OR branches from the first findMany call
  function getOrBranches() {
    const call = mockCalFindMany.mock.calls[0]![0] as {
      where: { institutionId?: string; OR?: Record<string, unknown>[] }
    }
    return call.where.OR ?? []
  }

  function getWhere() {
    const call = mockCalFindMany.mock.calls[0]![0] as {
      where: Record<string, unknown>
    }
    return call.where
  }

  it('institution scoping remains enforced at the top level', async () => {
    mockWsMemberFindMany.mockResolvedValue([])
    await calendarService.getEvents(INST_A, OTHER_USER)
    expect(getWhere().institutionId).toBe(INST_A)
  })

  it('creator visibility is preserved in OR branches', async () => {
    mockWsMemberFindMany.mockResolvedValue([])
    await calendarService.getEvents(INST_A, CREATOR_ID)
    expect(getOrBranches()).toContainEqual({ creatorId: CREATOR_ID })
  })

  it('attendee visibility is preserved in OR branches', async () => {
    mockWsMemberFindMany.mockResolvedValue([])
    await calendarService.getEvents(INST_A, OTHER_USER)
    expect(getOrBranches()).toContainEqual({ attendees: { array_contains: OTHER_USER } })
  })

  it('the unguarded { workspaceId: { not: null } } branch is no longer present', async () => {
    mockWsMemberFindMany.mockResolvedValue([])
    await calendarService.getEvents(INST_A, OTHER_USER)
    const branches = getOrBranches()
    for (const branch of branches) {
      expect(JSON.stringify(branch)).not.toContain('"not":null')
      expect(branch).not.toMatchObject({ workspaceId: { not: null } })
    }
  })

  it('workspace member sees workspace events (workspace they belong to appears in OR)', async () => {
    mockWsMemberFindMany.mockResolvedValue([{ workspaceId: WS_A }])
    await calendarService.getEvents(INST_A, CREATOR_ID)
    const branches = getOrBranches()
    expect(branches).toContainEqual({ workspaceId: { in: [WS_A] } })
  })

  it('workspace non-member does not get the workspace branch in OR', async () => {
    mockWsMemberFindMany.mockResolvedValue([]) // user has no workspace memberships
    await calendarService.getEvents(INST_A, OTHER_USER)
    const branches = getOrBranches()
    // No workspaceId branch at all — non-member only sees creator + attendee branches
    for (const branch of branches) {
      expect(branch).not.toHaveProperty('workspaceId')
    }
  })

  it('member of Workspace A does not see Workspace B events through the workspace branch', async () => {
    mockWsMemberFindMany.mockResolvedValue([{ workspaceId: WS_A }])
    await calendarService.getEvents(INST_A, CREATOR_ID)
    const branches = getOrBranches()
    const wsBranch = branches.find((b) => 'workspaceId' in b) as { workspaceId?: { in?: string[] } } | undefined
    // The in-list must only contain WS_A, not WS_B
    expect(wsBranch?.workspaceId?.in).toEqual([WS_A])
    expect(wsBranch?.workspaceId?.in).not.toContain(WS_B)
  })

  it('member of multiple workspaces sees all their workspace events', async () => {
    mockWsMemberFindMany.mockResolvedValue([{ workspaceId: WS_A }, { workspaceId: WS_B }])
    await calendarService.getEvents(INST_A, CREATOR_ID)
    const branches = getOrBranches()
    expect(branches).toContainEqual({ workspaceId: { in: [WS_A, WS_B] } })
  })

  it('workspaceMember query is scoped to the calling userId', async () => {
    mockWsMemberFindMany.mockResolvedValue([])
    await calendarService.getEvents(INST_A, CREATOR_ID)
    expect(mockWsMemberFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: CREATOR_ID } })
    )
  })
})
