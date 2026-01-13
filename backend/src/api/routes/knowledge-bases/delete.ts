import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

export async function deleteKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const params = request.params as { id: string };

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

            // Delete (cascades to documents and chunks)
            await kbRepository.delete(params.id);

            return reply.send({
                success: true,
                message: "Knowledge base deleted successfully"
            });
        }
    );
}
