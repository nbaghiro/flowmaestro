import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceInvitationRepository } from "../../../../storage/repositories/WorkspaceInvitationRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../../middleware";

const logger = createServiceLogger("WorkspaceInvitationRoutes");

export async function listInvitationsRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { workspaceId: string };
        Querystring: { status?: "all" | "pending" };
    }>(
        "/:workspaceId/invitations",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("invite_members")
            ]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const { status = "pending" } = request.query;

            try {
                const invitationRepo = new WorkspaceInvitationRepository();

                // findPendingByWorkspaceId returns array, findByWorkspaceId returns { invitations, total }
                const invitationsList =
                    status === "pending"
                        ? await invitationRepo.findPendingByWorkspaceId(workspaceId)
                        : (await invitationRepo.findByWorkspaceId(workspaceId)).invitations;

                return reply.send({
                    success: true,
                    data: invitationsList.map((inv) => ({
                        id: inv.id,
                        email: inv.email,
                        role: inv.role,
                        status: inv.status,
                        invitedBy: inv.invited_by,
                        message: inv.message,
                        expiresAt: inv.expires_at,
                        createdAt: inv.created_at
                    }))
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error listing invitations");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
