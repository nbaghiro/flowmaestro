import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateQuery, workspaceContextMiddleware } from "../../middleware";
import { listWorkflowsQuerySchema } from "../../schemas/workflow-schemas";

export async function listWorkflowsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateQuery(listWorkflowsQuerySchema)
            ]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const query = request.query as {
                limit?: number;
                offset?: number;
                folderId?: string;
            };

            // Parse folderId: "null" string means root level (no folder), undefined means all
            let folderId: string | null | undefined;
            if (query.folderId === "null") {
                folderId = null; // Root level (items not in any folder)
            } else if (query.folderId) {
                folderId = query.folderId; // Specific folder
            }
            // If folderId is undefined, all workflows are returned (no folder filter)

            const { workflows, total } = await workflowRepository.findByWorkspaceId(
                request.workspace!.id,
                {
                    limit: query.limit || 50,
                    offset: query.offset || 0,
                    folderId
                }
            );

            const limit = query.limit || 50;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + workflows.length < total;

            return reply.send({
                success: true,
                data: {
                    items: workflows,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
