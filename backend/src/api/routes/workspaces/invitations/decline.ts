import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceInvitationRepository } from "../../../../storage/repositories/WorkspaceInvitationRepository";
import { authMiddleware } from "../../../middleware";

const logger = createServiceLogger("WorkspaceInvitationRoutes");

export async function declineInvitationRoute(fastify: FastifyInstance) {
    fastify.post<{
        Params: { token: string };
    }>(
        "/invitations/:token/decline",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { token } = request.params;
            const userId = request.user!.id;
            const userEmail = request.user!.email;

            try {
                const invitationRepo = new WorkspaceInvitationRepository();

                // Get invitation
                const invitation = await invitationRepo.findByToken(token);

                if (!invitation) {
                    return reply.status(404).send({
                        success: false,
                        error: "Invitation not found"
                    });
                }

                // Validate invitation
                if (invitation.status !== "pending") {
                    return reply.status(400).send({
                        success: false,
                        error: `This invitation has already been ${invitation.status}`
                    });
                }

                // Check if invitation is for this user's email
                if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
                    return reply.status(403).send({
                        success: false,
                        error: "This invitation is for a different email address"
                    });
                }

                // Mark as declined
                await invitationRepo.markAsDeclined(invitation.id);

                logger.info(
                    { workspaceId: invitation.workspace_id, userId },
                    "Invitation declined"
                );

                return reply.send({
                    success: true,
                    message: "Invitation declined"
                });
            } catch (error) {
                logger.error({ token, userId, error }, "Error declining invitation");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
