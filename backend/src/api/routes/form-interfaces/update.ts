import { FastifyInstance } from "fastify";
import type { UpdateFormInterfaceInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";

const logger = createServiceLogger("FormInterfaceRoutes");

// Reserved slugs that cannot be used
const RESERVED_SLUGS = [
    "api",
    "admin",
    "login",
    "logout",
    "signup",
    "register",
    "settings",
    "dashboard",
    "workflows",
    "agents",
    "i",
    "form-interfaces",
    "connections",
    "knowledge-bases",
    "templates"
];

// Slug validation regex
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

export async function updateFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const { id } = request.params as { id: string };
            const body = request.body as UpdateFormInterfaceInput;
            const workspaceId = request.workspace!.id;

            try {
                // Check if form interface exists
                const existing = await formInterfaceRepo.findByIdAndWorkspaceId(id, workspaceId);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                // Validate slug if being updated
                if (body.slug !== undefined) {
                    if (!SLUG_REGEX.test(body.slug)) {
                        return reply.status(400).send({
                            success: false,
                            error: "Invalid slug format"
                        });
                    }

                    if (RESERVED_SLUGS.includes(body.slug.toLowerCase())) {
                        return reply.status(400).send({
                            success: false,
                            error: `The slug '${body.slug}' is reserved`
                        });
                    }

                    const isAvailable = await formInterfaceRepo.isSlugAvailableInWorkspace(
                        body.slug,
                        workspaceId,
                        id
                    );
                    if (!isAvailable) {
                        return reply.status(400).send({
                            success: false,
                            error: `The slug '${body.slug}' is already in use`
                        });
                    }
                }

                // Validate target type changes
                if (body.targetType !== undefined) {
                    if (body.targetType === "workflow" && !body.workflowId) {
                        return reply.status(400).send({
                            success: false,
                            error: "workflowId is required when changing targetType to 'workflow'"
                        });
                    }
                    if (body.targetType === "agent" && !body.agentId) {
                        return reply.status(400).send({
                            success: false,
                            error: "agentId is required when changing targetType to 'agent'"
                        });
                    }
                }

                const formInterface = await formInterfaceRepo.updateByWorkspaceId(
                    id,
                    workspaceId,
                    body
                );

                if (!formInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to update form interface"
                    });
                }

                logger.info({ formInterfaceId: id, workspaceId }, "Form interface updated");

                return reply.send({
                    success: true,
                    data: formInterface
                });
            } catch (error) {
                logger.error({ id, workspaceId, error }, "Error updating form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
