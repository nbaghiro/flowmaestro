import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceMemberRepository } from "../../../../storage/repositories/WorkspaceMemberRepository";
import {
    authMiddleware,
    workspaceContextMiddleware,
    requirePermission,
    canManageRole
} from "../../../middleware";

const logger = createServiceLogger("WorkspaceMemberRoutes");

export async function removeMemberRoute(fastify: FastifyInstance) {
    fastify.delete<{
        Params: { workspaceId: string; userId: string };
    }>(
        "/:workspaceId/members/:userId",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("remove_members")
            ]
        },
        async (request, reply) => {
            const { workspaceId, userId: targetUserId } = request.params;
            const actorUserId = request.user!.id;

            try {
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

                // Cannot remove owner
                if (targetMember.role === "owner") {
                    return reply.status(400).send({
                        success: false,
                        error: "Cannot remove the workspace owner"
                    });
                }

                // Check if actor can manage this role
                if (!canManageRole(request.workspace!.role, targetMember.role)) {
                    return reply.status(403).send({
                        success: false,
                        error: "You cannot remove members with this role"
                    });
                }

                // Remove member
                const success = await memberRepo.deleteByWorkspaceAndUser(
                    workspaceId,
                    targetUserId
                );

                if (!success) {
                    return reply.status(404).send({
                        success: false,
                        error: "Failed to remove member"
                    });
                }

                logger.info(
                    { workspaceId, targetUserId, actorUserId },
                    "Member removed from workspace"
                );

                return reply.send({
                    success: true,
                    message: "Member removed successfully"
                });
            } catch (error) {
                logger.error({ workspaceId, targetUserId, error }, "Error removing member");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
