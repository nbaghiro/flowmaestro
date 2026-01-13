import { FastifyInstance } from "fastify";
import type { UpdateMemberRoleInput, WorkspaceRole } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceMemberRepository } from "../../../../storage/repositories/WorkspaceMemberRepository";
import {
    authMiddleware,
    workspaceContextMiddleware,
    requirePermission,
    canManageRole,
    canAssignRole
} from "../../../middleware";

const logger = createServiceLogger("WorkspaceMemberRoutes");

export async function updateMemberRoleRoute(fastify: FastifyInstance) {
    fastify.put<{
        Params: { workspaceId: string; userId: string };
        Body: UpdateMemberRoleInput;
    }>(
        "/:workspaceId/members/:userId/role",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("change_roles")
            ]
        },
        async (request, reply) => {
            const { workspaceId, userId: targetUserId } = request.params;
            const actorUserId = request.user!.id;
            const { role: newRole } = request.body;

            try {
                // Validate role
                const validRoles: WorkspaceRole[] = ["admin", "member", "viewer"];
                if (!validRoles.includes(newRole)) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid role. Must be admin, member, or viewer"
                    });
                }

                const memberRepo = new WorkspaceMemberRepository();

                // Get target member
                const targetMember = await memberRepo.findByWorkspaceAndUser(
                    workspaceId,
                    targetUserId
                );

                if (!targetMember) {
                    return reply.status(404).send({
                        success: false,
                        error: "Member not found"
                    });
                }

                // Cannot change owner role
                if (targetMember.role === "owner") {
                    return reply.status(400).send({
                        success: false,
                        error: "Cannot change the owner's role. Use transfer ownership instead."
                    });
                }

                // Check if actor can manage current role
                if (!canManageRole(request.workspace!.role, targetMember.role)) {
                    return reply.status(403).send({
                        success: false,
                        error: "You cannot modify members with this role"
                    });
                }

                // Check if actor can assign new role
                if (!canAssignRole(request.workspace!.role, newRole)) {
                    return reply.status(403).send({
                        success: false,
                        error: "You cannot assign this role"
                    });
                }

                // Update role
                const updatedMember = await memberRepo.updateRole(
                    workspaceId,
                    targetUserId,
                    newRole
                );

                if (!updatedMember) {
                    return reply.status(404).send({
                        success: false,
                        error: "Failed to update member role"
                    });
                }

                logger.info(
                    { workspaceId, targetUserId, newRole, actorUserId },
                    "Member role updated"
                );

                return reply.send({
                    success: true,
                    data: memberRepo.modelToShared(updatedMember)
                });
            } catch (error) {
                logger.error(
                    { workspaceId, targetUserId, newRole, error },
                    "Error updating member role"
                );
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
