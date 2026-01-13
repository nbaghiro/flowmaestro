import { FastifyInstance } from "fastify";
import type { UpdateWorkspaceInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { workspaceService } from "../../../services/workspace";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("WorkspaceRoutes");

export async function updateWorkspaceRoute(fastify: FastifyInstance) {
    fastify.put<{
        Params: { workspaceId: string };
        Body: UpdateWorkspaceInput;
    }>(
        "/:workspaceId",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("edit_settings")
            ]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const body = request.body;

            try {
                // Validate name if provided
                if (body.name !== undefined) {
                    if (body.name.trim().length === 0) {
                        return reply.status(400).send({
                            success: false,
                            error: "Workspace name cannot be empty"
                        });
                    }
                    if (body.name.length > 100) {
                        return reply.status(400).send({
                            success: false,
                            error: "Workspace name must be 100 characters or less"
                        });
                    }
                }

                const workspace = await workspaceService.updateWorkspace(workspaceId, {
                    name: body.name?.trim(),
                    description: body.description,
                    billingEmail: body.billingEmail,
                    settings: body.settings
                });

                if (!workspace) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workspace not found"
                    });
                }

                logger.info({ workspaceId }, "Workspace updated");

                return reply.send({
                    success: true,
                    data: workspace
                });
            } catch (error) {
                logger.error({ workspaceId, body, error }, "Error updating workspace");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
