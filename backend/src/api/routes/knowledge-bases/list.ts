import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

export async function listKnowledgeBasesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const query = request.query as { limit?: string; offset?: string; folderId?: string };

            const limit = query.limit ? parseInt(query.limit) : 50;
            const offset = query.offset ? parseInt(query.offset) : 0;

            // Parse folderId: "null" string means root level (no folder), undefined means all
            let folderId: string | null | undefined;
            if (query.folderId === "null") {
                folderId = null;
            } else if (query.folderId) {
                folderId = query.folderId;
            }

            const result = await kbRepository.findByWorkspaceId(request.workspace!.id, {
                limit,
                offset,
                folderId
            });

            return reply.send({
                success: true,
                data: result.knowledgeBases,
                pagination: {
                    total: result.total,
                    limit,
                    offset
                }
            });
        }
    );
}
