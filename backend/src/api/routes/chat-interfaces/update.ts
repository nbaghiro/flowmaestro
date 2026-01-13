import { FastifyInstance } from "fastify";
import type { UpdateChatInterfaceInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
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

// Slug validation regex
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/;

export async function updateChatInterfaceRoute(fastify: FastifyInstance) {
    fastify.put("/:id", async (request, reply) => {
        const chatInterfaceRepo = new ChatInterfaceRepository();
        const { id } = request.params as { id: string };
        const body = request.body as UpdateChatInterfaceInput;
        const workspaceId = request.workspace!.id;

        try {
            // Check if chat interface exists in workspace
            const existing = await chatInterfaceRepo.findByIdAndWorkspaceId(id, workspaceId);
            if (!existing) {
                return reply.status(404).send({
                    success: false,
                    error: "Chat interface not found"
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

                const isAvailable = await chatInterfaceRepo.isSlugAvailableInWorkspace(
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

            const chatInterface = await chatInterfaceRepo.updateByWorkspaceId(
                id,
                workspaceId,
                body
            );

            if (!chatInterface) {
                return reply.status(500).send({
                    success: false,
                    error: "Failed to update chat interface"
                });
            }

            logger.info({ chatInterfaceId: id, workspaceId }, "Chat interface updated");

            return reply.send({
                success: true,
                data: chatInterface
            });
        } catch (error) {
            logger.error({ id, workspaceId, error }, "Error updating chat interface");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
