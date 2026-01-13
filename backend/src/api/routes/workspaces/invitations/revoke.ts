import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceInvitationRepository } from "../../../../storage/repositories/WorkspaceInvitationRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../../middleware";

const logger = createServiceLogger("WorkspaceInvitationRoutes");

export async function revokeInvitationRoute(fastify: FastifyInstance) {
    fastify.delete<{
        Params: { workspaceId: string; invitationId: string };
    }>(
        "/:workspaceId/invitations/:invitationId",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("invite_members")
            ]
        },
        async (request, reply) => {
            const { workspaceId, invitationId } = request.params;
            const userId = request.user!.id;

            try {
                const invitationRepo = new WorkspaceInvitationRepository();

                // Get invitation
                const invitation = await invitationRepo.findById(invitationId);

                if (!invitation || invitation.workspace_id !== workspaceId) {
                    return reply.status(404).send({
                        success: false,
                        error: "Invitation not found"
                    });
                }

                if (invitation.status !== "pending") {
                    return reply.status(400).send({
                        success: false,
                        error: "Can only revoke pending invitations"
                    });
                }

                // Delete invitation
                const success = await invitationRepo.delete(invitationId);

                if (!success) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to revoke invitation"
                    });
                }

                logger.info({ workspaceId, invitationId, userId }, "Invitation revoked");

                return reply.send({
                    success: true,
                    message: "Invitation revoked successfully"
                });
            } catch (error) {
                logger.error({ workspaceId, invitationId, error }, "Error revoking invitation");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
