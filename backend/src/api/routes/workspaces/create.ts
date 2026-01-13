import { FastifyInstance } from "fastify";
import type { CreateWorkspaceInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { workspaceService } from "../../../services/workspace";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("WorkspaceRoutes");

export async function createWorkspaceRoute(fastify: FastifyInstance) {
    fastify.post<{
        Body: CreateWorkspaceInput;
    }>(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;
            const body = request.body;

            try {
                // Validate required fields
                if (!body.name || body.name.trim().length === 0) {
                    return reply.status(400).send({
                        success: false,
                        error: "Workspace name is required"
                    });
                }

                if (body.name.length > 100) {
                    return reply.status(400).send({
                        success: false,
                        error: "Workspace name must be 100 characters or less"
                    });
                }

                // Create workspace
                const workspace = await workspaceService.createWorkspace(userId, {
                    name: body.name.trim(),
                    description: body.description,
                    category: body.category
                });

                logger.info({ workspaceId: workspace.id, userId }, "Workspace created");

                return reply.status(201).send({
                    success: true,
                    data: workspace
                });
            } catch (error) {
                logger.error({ userId, body, error }, "Error creating workspace");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
