import { FastifyInstance } from "fastify";
import { KnowledgeBaseRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

interface CreateKnowledgeBaseBody {
    name: string;
    description?: string;
    config?: {
        [key: string]: string | number | boolean | null;
    };
}

export async function createKnowledgeBaseRoute(fastify: FastifyInstance) {
    fastify.post<{ Body: CreateKnowledgeBaseBody }>(
        "/",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const kbRepository = new KnowledgeBaseRepository();
            const body = request.body;

            const knowledgeBase = await kbRepository.create({
                user_id: request.user!.id,
                workspace_id: request.workspace!.id,
                name: body.name,
                description: body.description,
                config: body.config
            });

            return reply.status(201).send({
                success: true,
                data: knowledgeBase
            });
        }
    );
}
