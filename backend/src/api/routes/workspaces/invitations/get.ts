import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceInvitationRepository } from "../../../../storage/repositories/WorkspaceInvitationRepository";

const logger = createServiceLogger("WorkspaceInvitationRoutes");

/**
 * Public route to get invitation details by token.
 * Used by the accept invitation page to show invitation info.
 */
export async function getInvitationRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { token: string };
    }>("/invitations/:token", async (request, reply) => {
        const { token } = request.params;

        try {
            const invitationRepo = new WorkspaceInvitationRepository();
            const invitation = await invitationRepo.findByTokenWithDetails(token);

            if (!invitation) {
                return reply.status(404).send({
                    success: false,
                    error: "Invitation not found"
                });
            }

            // Check if expired
            if (new Date() > invitation.expiresAt) {
                return reply.status(400).send({
                    success: false,
                    error: "This invitation has expired"
                });
            }

            // Check status
            if (invitation.status !== "pending") {
                return reply.status(400).send({
                    success: false,
                    error: `This invitation has already been ${invitation.status}`
                });
            }

            return reply.send({
                success: true,
                data: {
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role,
                    message: invitation.message,
                    expiresAt: invitation.expiresAt,
                    workspace: invitation.workspace,
                    inviter: invitation.inviter
                }
            });
        } catch (error) {
            logger.error({ token, error }, "Error getting invitation");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
