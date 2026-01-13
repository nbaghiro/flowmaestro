import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { WorkspaceMemberRepository } from "../../../../storage/repositories/WorkspaceMemberRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../../middleware";

const logger = createServiceLogger("WorkspaceMemberRoutes");

export async function listMembersRoute(fastify: FastifyInstance) {
    fastify.get<{
        Params: { workspaceId: string };
    }>(
        "/:workspaceId/members",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("view")]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;

            try {
                const memberRepo = new WorkspaceMemberRepository();
                const members = await memberRepo.findByWorkspaceIdWithUsers(workspaceId);

                return reply.send({
                    success: true,
                    data: members
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error listing members");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
