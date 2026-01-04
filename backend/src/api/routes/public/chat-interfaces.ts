import { FastifyInstance } from "fastify";
import type {
    CreateChatSessionInput,
    ChatSessionResponse,
    PublicChatMessage,
    SendChatMessageInput
} from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { ChatInterfaceRepository } from "../../../storage/repositories/ChatInterfaceRepository";
import { ChatInterfaceSessionRepository } from "../../../storage/repositories/ChatInterfaceSessionRepository";
import { chatInterfaceRateLimiter } from "../../middleware/chatInterfaceRateLimiter";

const logger = createServiceLogger("PublicChatInterfaceRoutes");

export async function publicChatInterfaceRoutes(fastify: FastifyInstance) {
    const chatInterfaceRepo = new ChatInterfaceRepository();
    const sessionRepo = new ChatInterfaceSessionRepository();

    /**
     * GET /api/public/chat-interfaces/:slug
     * Get a published chat interface for rendering (no auth required)
     */
    fastify.get("/:slug", async (request, reply) => {
        const { slug } = request.params as { slug: string };

        try {
            const publicInterface = await chatInterfaceRepo.findBySlugPublic(slug);

            if (!publicInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Chat interface not found"
                });
            }

            return reply.send({
                success: true,
                data: publicInterface
            });
        } catch (error) {
            logger.error({ slug, error }, "Error fetching public chat interface");
            return reply.status(500).send({
                success: false,
                error: "Failed to load chat interface"
            });
        }
    });

    /**
     * POST /api/public/chat-interfaces/:slug/sessions
     * Create or resume a chat session (no auth required)
     */
    fastify.post("/:slug/sessions", async (request, reply) => {
        const { slug } = request.params as { slug: string };
        const body = request.body as CreateChatSessionInput;

        try {
            // Find the chat interface
            const chatInterface = await chatInterfaceRepo.findBySlug(slug);

            if (!chatInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Chat interface not found"
                });
            }

            // Try to resume existing session
            let session = null;

            // First, try to resume by persistence token (localStorage)
            if (body.persistenceToken && chatInterface.persistenceType === "local_storage") {
                session = await sessionRepo.findByPersistenceToken(
                    chatInterface.id,
                    body.persistenceToken
                );
            }

            // If no session found and fingerprint provided, try fingerprint match
            if (!session && body.browserFingerprint) {
                session = await sessionRepo.findByFingerprint(
                    chatInterface.id,
                    body.browserFingerprint
                );
            }

            // If resuming an existing session, update last activity
            if (session) {
                await sessionRepo.updateLastActivity(session.id);
                logger.info(
                    { sessionId: session.id, chatInterfaceId: chatInterface.id },
                    "Chat session resumed"
                );
            }

            // Create new session if none found
            if (!session) {
                const persistenceToken =
                    chatInterface.persistenceType === "local_storage"
                        ? sessionRepo.generatePersistenceToken()
                        : undefined;

                session = await sessionRepo.create({
                    interfaceId: chatInterface.id,
                    browserFingerprint: body.browserFingerprint,
                    ipAddress: request.ip,
                    userAgent: request.headers["user-agent"] || undefined,
                    referrer: body.referrer,
                    persistenceToken
                });

                logger.info(
                    { sessionId: session.id, chatInterfaceId: chatInterface.id },
                    "New chat session created"
                );
            }

            const response: ChatSessionResponse = {
                sessionId: session.id,
                sessionToken: session.sessionToken,
                threadId: session.threadId
                // Phase 2 will add: existingMessages from thread
            };

            // Include persistence token for localStorage sessions
            if (session.persistenceToken) {
                response.persistenceToken = session.persistenceToken;
            }

            return reply.send({
                success: true,
                data: response
            });
        } catch (error) {
            logger.error({ slug, error }, "Error creating chat session");
            return reply.status(500).send({
                success: false,
                error: "Failed to create session"
            });
        }
    });

    /**
     * GET /api/public/chat-interfaces/:slug/sessions/:token/messages
     * Get message history for a session (no auth required)
     */
    fastify.get("/:slug/sessions/:token/messages", async (request, reply) => {
        const { slug, token } = request.params as { slug: string; token: string };

        try {
            // Find the chat interface
            const chatInterface = await chatInterfaceRepo.findBySlug(slug);

            if (!chatInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Chat interface not found"
                });
            }

            // Find session
            const session = await sessionRepo.findBySessionToken(chatInterface.id, token);

            if (!session) {
                return reply.status(404).send({
                    success: false,
                    error: "Session not found"
                });
            }

            // Phase 1: Return empty messages array
            // Phase 2 will add thread message retrieval via ThreadRepository
            const messages: PublicChatMessage[] = [];

            return reply.send({
                success: true,
                data: {
                    messages,
                    sessionId: session.id,
                    messageCount: session.messageCount
                }
            });
        } catch (error) {
            logger.error({ slug, token, error }, "Error fetching chat messages");
            return reply.status(500).send({
                success: false,
                error: "Failed to load messages"
            });
        }
    });

    /**
     * POST /api/public/chat-interfaces/:slug/messages
     * Send a message to a chat session (rate limited, no auth required)
     * Phase 1: Store message only, Phase 2 will add agent execution
     */
    fastify.post(
        "/:slug/messages",
        {
            preHandler: [chatInterfaceRateLimiter]
        },
        async (request, reply) => {
            const { slug } = request.params as { slug: string };
            const body = request.body as SendChatMessageInput;

            try {
                // Find the chat interface
                const chatInterface = await chatInterfaceRepo.findBySlug(slug);

                if (!chatInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Chat interface not found"
                    });
                }

                // Find session by token
                const session = await sessionRepo.findBySessionToken(
                    chatInterface.id,
                    body.sessionToken
                );

                if (!session) {
                    return reply.status(404).send({
                        success: false,
                        error: "Session not found or expired"
                    });
                }

                // Validate message
                if (!body.message || body.message.trim() === "") {
                    return reply.status(400).send({
                        success: false,
                        error: "Message is required"
                    });
                }

                // Increment message count
                await sessionRepo.incrementMessageCount(session.id);

                // Phase 1: Just acknowledge the message
                // Phase 2 will add:
                // - Create thread if needed
                // - Execute agent
                // - Stream response

                logger.info(
                    {
                        sessionId: session.id,
                        chatInterfaceId: chatInterface.id,
                        messageLength: body.message.length
                    },
                    "Chat message received"
                );

                return reply.status(201).send({
                    success: true,
                    data: {
                        messageId: `msg_${Date.now()}`, // Temporary ID for Phase 1
                        status: "stored"
                    }
                });
            } catch (error) {
                logger.error({ slug, error }, "Error processing chat message");
                return reply.status(500).send({
                    success: false,
                    error: "Failed to process message"
                });
            }
        }
    );
}
