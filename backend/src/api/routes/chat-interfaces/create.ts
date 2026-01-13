import { FastifyInstance } from "fastify";
import type { CreateChatInterfaceInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";

const logger = createServiceLogger("ChatInterfaceRoutes");

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
    "c",
    "embed",
    "widget",
    "chat-interfaces",
    "form-interfaces",
    "connections",
    "knowledge-bases",
    "templates"
];

// Slug validation regex: lowercase alphanumeric with hyphens, 2-100 chars
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

export async function createChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.post("/", async (request, reply) => {
        const chatInterfaceRepo = new ChatInterfaceRepository();
        const agentRepo = new AgentRepository();
        const body = request.body as CreateChatInterfaceInput;
        const userId = request.user!.id;
        const workspaceId = request.workspace!.id;

        try {
            // Validate required fields
            if (!body.name || !body.slug || !body.title || !body.agentId) {
                return reply.status(400).send({
                    success: false,
                    error: "Missing required fields: name, slug, title, and agentId are required"
                });
            }

            // Validate agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(body.agentId, workspaceId);
            if (!agent) {
                return reply.status(400).send({
                    success: false,
                    error: "Agent not found or does not belong to this workspace"
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

            // Check slug availability within workspace
            const isAvailable = await chatInterfaceRepo.isSlugAvailableInWorkspace(
                body.slug,
                workspaceId
            );
            if (!isAvailable) {
                return reply.status(400).send({
                    success: false,
                    error: `The slug '${body.slug}' is already in use`
                });
            }

            // Create chat interface
            const chatInterface = await chatInterfaceRepo.create(userId, workspaceId, body);

            logger.info(
                { chatInterfaceId: chatInterface.id, workspaceId },
                "Chat interface created"
            );

            return reply.status(201).send({
                success: true,
                data: chatInterface
            });
        } catch (error) {
            logger.error({ workspaceId, body, error }, "Error creating chat interface");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
