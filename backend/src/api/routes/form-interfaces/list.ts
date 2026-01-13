import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function listFormInterfacesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const workspaceId = request.workspace!.id;
            const query = request.query as {
                limit?: string;
                offset?: string;
                workflowId?: string;
                agentId?: string;
                folderId?: string;
            };

            try {
                // If filtering by workflow or agent, use specific method
                if (query.workflowId) {
                    const formInterfaces = await formInterfaceRepo.findByWorkflowIdAndWorkspaceId(
                        query.workflowId,
                        workspaceId
                    );
                    return reply.send({
                        success: true,
                        data: {
                            items: formInterfaces,
                            total: formInterfaces.length,
                            page: 1,
                            pageSize: formInterfaces.length,
                            hasMore: false
                        }
                    });
                }

                if (query.agentId) {
                    const formInterfaces = await formInterfaceRepo.findByAgentIdAndWorkspaceId(
                        query.agentId,
                        workspaceId
                    );
                    return reply.send({
                        success: true,
                        data: {
                            items: formInterfaces,
                            total: formInterfaces.length,
                            page: 1,
                            pageSize: formInterfaces.length,
                            hasMore: false
                        }
                    });
                }

                // Standard pagination
                const limit = query.limit ? parseInt(query.limit) : 50;
                const offset = query.offset ? parseInt(query.offset) : 0;

                // Parse folderId: "null" string means root level (no folder), undefined means all
                let folderId: string | null | undefined;
                if (query.folderId === "null") {
                    folderId = null;
                } else if (query.folderId) {
                    folderId = query.folderId;
                }

                const { formInterfaces, total } = await formInterfaceRepo.findByWorkspaceId(
                    workspaceId,
                    {
                        limit,
                        offset,
                        folderId
                    }
                );

                const page = Math.floor(offset / limit) + 1;
                const hasMore = offset + formInterfaces.length < total;

                return reply.send({
                    success: true,
                    data: {
                        items: formInterfaces,
                        total,
                        page,
                        pageSize: limit,
                        hasMore
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, error }, "Error listing form interfaces");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
