import { FastifyInstance } from "fastify";
import type { CreateFormInterfaceInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

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

// Slug validation regex: lowercase alphanumeric with hyphens, 2-100 chars
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

export async function createFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const body = request.body as CreateFormInterfaceInput;
            const userId = request.user!.id;

            try {
                // Validate required fields
                if (!body.name || !body.slug || !body.title || !body.targetType) {
                    return reply.status(400).send({
                        success: false,
                        error: "Missing required fields: name, slug, title, and targetType are required"
                    });
                }

                // Validate target
                if (body.targetType === "workflow" && !body.workflowId) {
                    return reply.status(400).send({
                        success: false,
                        error: "workflowId is required when targetType is 'workflow'"
                    });
                }

                if (body.targetType === "agent" && !body.agentId) {
                    return reply.status(400).send({
                        success: false,
                        error: "agentId is required when targetType is 'agent'"
                    });
                }

                // Validate slug format
                if (!SLUG_REGEX.test(body.slug)) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid slug format. Must be 2-100 characters, lowercase alphanumeric with hyphens, starting and ending with alphanumeric"
                    });
                }

                // Check reserved slugs
                if (RESERVED_SLUGS.includes(body.slug.toLowerCase())) {
                    return reply.status(400).send({
                        success: false,
                        error: `The slug '${body.slug}' is reserved and cannot be used`
                    });
                }

                // Check slug availability
                const isAvailable = await formInterfaceRepo.isSlugAvailable(body.slug, userId);
                if (!isAvailable) {
                    return reply.status(400).send({
                        success: false,
                        error: `The slug '${body.slug}' is already in use`
                    });
                }

                // Create form interface
                const formInterface = await formInterfaceRepo.create(userId, body);

                logger.info(
                    { formInterfaceId: formInterface.id, userId },
                    "Form interface created"
                );

                return reply.status(201).send({
                    success: true,
                    data: formInterface
                });
            } catch (error) {
                logger.error({ userId, body, error }, "Error creating form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
