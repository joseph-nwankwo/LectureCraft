import type { Response } from 'express'
import type { Request } from 'express'
import { workspaceService } from '../../services/workspace/workspace.service'
import { asyncHandler } from '../../utils/asyncHandler'
import { getGatewayIo, ejectUserFromConversation } from '../../gateway/socket.gateway'
import { prisma } from '../../config/database'
import type { WorkspaceVisibility, WorkspaceMemberRole } from '@prisma/client'

export const workspaceController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, visibility } = req.body
    const workspace = await workspaceService.create({
      institutionId: req.user!.institutionId!,
      ownerId: req.user!.userId,
      name,
      description,
      visibility: visibility as WorkspaceVisibility | undefined,
    })
    res.status(201).json({ success: true, data: workspace })
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await workspaceService.list(req.user!.institutionId!, req.user!.userId, { page, limit })
    res.json({ success: true, ...result })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const workspace = await workspaceService.get(
      req.params.id as string, req.user!.userId, req.user!.institutionId ?? null,
    )
    res.json({ success: true, data: workspace })
  }),

  getDashboard: asyncHandler(async (req: Request, res: Response) => {
    const dashboard = await workspaceService.getDashboard(
      req.params.id as string, req.user!.userId, req.user!.institutionId ?? null,
    )
    res.json({ success: true, data: dashboard })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const workspace = await workspaceService.update(
      req.params.id as string,
      req.user!.userId,
      req.body
    )
    res.json({ success: true, data: workspace })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await workspaceService.delete(req.params.id as string, req.user!.userId)
    res.json({ success: true, message: 'Workspace deleted' })
  }),

  getMembers: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 50
    const result = await workspaceService.getMembers(
      req.params.id as string, req.user!.userId, req.user!.institutionId ?? null, { page, limit },
    )
    res.json({ success: true, ...result })
  }),

  addMember: asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = req.body
    const member = await workspaceService.addMember(
      req.params.id as string,
      req.user!.userId,
      userId,
      role as WorkspaceMemberRole | undefined
    )
    res.status(201).json({ success: true, data: member })
  }),

  removeMember: asyncHandler(async (req: Request, res: Response) => {
    const workspaceId = req.params.id as string
    const targetUserId = req.params.userId as string
    await workspaceService.removeMember(workspaceId, req.user!.userId, targetUserId)

    // Eject the removed user from all socket rooms for conversations in this
    // workspace so they cannot receive messages after removal.
    const io = getGatewayIo()
    if (io) {
      const wsConvs = await prisma.conversation.findMany({
        where: { workspaceId },
        select: { id: true },
      })
      for (const conv of wsConvs) {
        ejectUserFromConversation(io, targetUserId, conv.id)
      }
    }

    res.json({ success: true, message: 'Member removed' })
  }),

  updateMemberRole: asyncHandler(async (req: Request, res: Response) => {
    const member = await workspaceService.updateMemberRole(
      req.params.id as string,
      req.user!.userId,
      req.params.userId as string,
      req.body.role as WorkspaceMemberRole
    )
    res.json({ success: true, data: member })
  }),
}
