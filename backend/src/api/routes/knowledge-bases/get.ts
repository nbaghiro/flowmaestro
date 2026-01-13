import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

export async function getKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const params = request.params as { id: string };

            const knowledgeBase = await kbRepository.findByIdAndWorkspaceId(
                params.id,
                request.workspace!.id
            );

            if (!knowledgeBase) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            return reply.send({
                success: true,
                data: knowledgeBase
            });
        }
    );
}
