import { z } from "zod";
import type { VoiceClientMessage } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { voiceSessionManager } from "../../services/voice";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";

const logger = createServiceLogger("VoiceWebSocket");

// Schema for all client messages
const clientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("start_session"),
        agentId: z.string().uuid(),
        threadId: z.string().uuid()
    }),
    z.object({
        type: z.literal("audio_chunk"),
        data: z.string() // base64 PCM
    }),
    z.object({ type: z.literal("stop_recording") }),
    z.object({ type: z.literal("interrupt") }),
    z.object({ type: z.literal("end_session") })
]);

/**
 * Register voice WebSocket routes
 */
export async function voiceWebSocketRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * Voice chat WebSocket endpoint
     *
     * Flow:
     * 1. Client connects to /ws/voice
     * 2. Client sends start_session with agentId and threadId
     * 3. Server creates VoiceSession (connects to Deepgram/ElevenLabs)
     * 4. Client streams audio chunks
     * 5. Server sends transcripts and audio responses
     * 6. Client can interrupt or end session
     */
    fastify.get(
        "/ws/voice",
        { websocket: true },
        async (socket: WebSocket, request: FastifyRequest) => {
            let sessionInitialized = false;

            logger.info({ remoteAddress: request.ip }, "Voice WebSocket connection established");

            // Get user from JWT token and workspaceId from query params
            // (WebSocket can't use headers easily, so we pass as query params)
            const queryParams = request.query as { token?: string; workspaceId?: string };
            if (!queryParams.token) {
                logger.warn("No auth token provided");
                socket.send(JSON.stringify({ type: "error", message: "Authentication required" }));
                socket.close(4001, "Authentication required");
                return;
            }

            if (!queryParams.workspaceId) {
                logger.warn("No workspace ID provided");
                socket.send(JSON.stringify({ type: "error", message: "Workspace ID required" }));
                socket.close(4001, "Workspace ID required");
                return;
            }

            // Verify JWT token
            let userId: string;
            const workspaceId = queryParams.workspaceId;
            try {
                const decoded = fastify.jwt.verify(queryParams.token) as {
                    id: string;
                    email?: string;
                };
                userId = decoded.id;
            } catch (error) {
                logger.warn({ err: error }, "Invalid auth token");
                socket.send(JSON.stringify({ type: "error", message: "Invalid token" }));
                socket.close(4001, "Invalid token");
                return;
            }

            logger.info({ userId }, "Voice WebSocket authenticated");

            // Handle incoming messages
            socket.on("message", async (data: Buffer | string) => {
                try {
                    const messageStr = typeof data === "string" ? data : data.toString();
                    const rawMessage = JSON.parse(messageStr);

                    // Validate message
                    const parseResult = clientMessageSchema.safeParse(rawMessage);
                    if (!parseResult.success) {
                        logger.warn({ error: parseResult.error }, "Invalid message format");
                        socket.send(
                            JSON.stringify({
                                type: "error",
                                message: "Invalid message format"
                            })
                        );
                        return;
                    }

                    const message = parseResult.data as VoiceClientMessage;

                    // Handle start_session separately
                    if (message.type === "start_session") {
                        if (sessionInitialized) {
                            socket.send(
                                JSON.stringify({
                                    type: "error",
                                    message: "Session already initialized"
                                })
                            );
                            return;
                        }

                        try {
                            await voiceSessionManager.createSession(socket, {
                                agentId: message.agentId,
                                threadId: message.threadId,
                                userId,
                                workspaceId
                            });
                            sessionInitialized = true;
                        } catch (error) {
                            const errorMessage =
                                error instanceof Error ? error.message : "Failed to start session";
                            logger.error({ err: error }, "Failed to create voice session");
                            socket.send(
                                JSON.stringify({
                                    type: "error",
                                    message: errorMessage
                                })
                            );
                        }
                        return;
                    }

                    // All other messages require an active session
                    if (!sessionInitialized) {
                        socket.send(
                            JSON.stringify({
                                type: "error",
                                message: "Session not started. Send start_session first."
                            })
                        );
                        return;
                    }

                    // Forward message to session
                    const session = voiceSessionManager.getSessionBySocket(socket);
                    if (session) {
                        await session.handleClientMessage(message);
                    }
                } catch (error) {
                    logger.error({ err: error }, "Error processing WebSocket message");
                    socket.send(
                        JSON.stringify({
                            type: "error",
                            message: "Internal error processing message"
                        })
                    );
                }
            });

            // Handle close
            socket.on("close", async (code: number, reason: Buffer) => {
                logger.info(
                    { code, reason: reason.toString(), userId },
                    "Voice WebSocket connection closed"
                );
                await voiceSessionManager.closeSessionBySocket(socket);
            });

            // Handle errors
            socket.on("error", async (error: Error) => {
                logger.error({ err: error, userId }, "Voice WebSocket error");
                await voiceSessionManager.closeSessionBySocket(socket);
            });
        }
    );
}
