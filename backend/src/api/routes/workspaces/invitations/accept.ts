import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceInvitationRepository } from "../../../../storage/repositories/WorkspaceInvitationRepository";
import { WorkspaceMemberRepository } from "../../../../storage/repositories/WorkspaceMemberRepository";
import { authMiddleware } from "../../../middleware";

const logger = createServiceLogger("WorkspaceInvitationRoutes");

export async function acceptInvitationRoute(fastify: FastifyInstance) {
    fastify.post<{
        Params: { token: string };
    }>(
        "/invitations/:token/accept",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { token } = request.params;
            const userId = request.user!.id;
            const userEmail = request.user!.email;

            try {
                const invitationRepo = new WorkspaceInvitationRepository();
                const memberRepo = new WorkspaceMemberRepository();

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

                if (new Date() > invitation.expires_at) {
                    await invitationRepo.update(invitation.id, { status: "expired" });
                    return reply.status(400).send({
                        success: false,
                        error: "This invitation has expired"
                    });
                }

                // Check if invitation is for this user's email
                if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
                    return reply.status(403).send({
                        success: false,
                        error: "This invitation is for a different email address"
                    });
                }

                // Check if already a member
                const existingMember = await memberRepo.findByWorkspaceAndUser(
                    invitation.workspace_id,
                    userId
                );

                if (existingMember) {
                    // Mark invitation as accepted anyway
                    await invitationRepo.markAsAccepted(invitation.id);
                    return reply.status(400).send({
                        success: false,
                        error: "You are already a member of this workspace"
                    });
                }

                // Create membership
                await memberRepo.create({
                    workspace_id: invitation.workspace_id,
                    user_id: userId,
                    role: invitation.role,
                    invited_by: invitation.invited_by,
                    invited_at: invitation.created_at,
                    accepted_at: new Date()
                });

                // Mark invitation as accepted
                await invitationRepo.markAsAccepted(invitation.id);

                logger.info(
                    { workspaceId: invitation.workspace_id, userId, role: invitation.role },
                    "Invitation accepted"
                );

                return reply.send({
                    success: true,
                    data: {
                        workspaceId: invitation.workspace_id,
                        role: invitation.role
                    }
                });
            } catch (error) {
                logger.error({ token, userId, error }, "Error accepting invitation");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
