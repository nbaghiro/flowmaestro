import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

export async function updateKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const params = request.params as { id: string };
            const body = request.body as {
                name?: string;
                description?: string;
                config?: Record<string, unknown>;
            };

            // Verify workspace ownership
            const existing = await kbRepository.findByIdAndWorkspaceId(
                params.id,
                request.workspace!.id
            );
            if (!existing) {
                return reply.status(404).send({
                    success: false,
                    error: "Knowledge base not found"
                });
            }

            const updated = await kbRepository.update(params.id, {
                name: body.name,
                description: body.description,
                config: body.config
            });

            return reply.send({
                success: true,
                data: updated
            });
        }
    );
}
