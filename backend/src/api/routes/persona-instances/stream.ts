/**
 * Persona Instance Stream Route
 *
 * SSE endpoint for real-time persona instance updates.
 * GET /api/persona-instances/:id/stream
 *
 * Subscribes to Redis events for the persona instance and forwards them to the client.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { createSSEHandler, sendTerminalEvent } from "../../../services/sse";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { authMiddleware, NotFoundError } from "../../middleware";

const logger = createServiceLogger("PersonaStreamRoute");

interface StreamPersonaInstanceParams {
    id: string;
}

const TERMINAL_EVENTS = ["persona:instance:completed", "persona:instance:failed"];

export async function streamPersonaInstanceRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{
        Params: StreamPersonaInstanceParams;
    }>(
        "/:id/stream",
        {
            preHandler: [authMiddleware]
        },
        async (
            request: FastifyRequest<{
                Params: StreamPersonaInstanceParams;
            }>,
            reply: FastifyReply
        ): Promise<void> => {
            const instanceRepo = new PersonaInstanceRepository();
            const { id: instanceId } = request.params;
            const workspaceId = request.workspace?.id;

            if (!workspaceId) {
                throw new NotFoundError("Workspace context required");
            }

            // Verify instance exists and user has access
            const instance = await instanceRepo.findByIdAndWorkspaceId(instanceId, workspaceId);

            if (!instance) {
                throw new NotFoundError("Persona instance not found");
            }

            logger.info({ instanceId, workspaceId }, "SSE connection established");

            // Create SSE handler with CORS headers
            const origin = request.headers.origin || "*";

            const sse = createSSEHandler(request, reply, {
                keepAliveInterval: 15000,
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Authorization, X-Session-ID, X-Workspace-Id, Cache-Control"
                }
            });

            // If instance is already in a terminal state, send that and close
            if (["completed", "failed", "cancelled", "timeout"].includes(instance.status)) {
                logger.info(
                    { instanceId, status: instance.status },
                    "Instance already in terminal state"
                );

                const isSuccess = instance.status === "completed";
                const eventType = isSuccess
                    ? "persona:instance:completed"
                    : "persona:instance:failed";

                // Send connected event first
                sse.sendEvent("connected", {
                    instanceId,
                    status: instance.status,
                    progress: instance.progress,
                    isTerminal: true
                });

                // Send terminal event
                sendTerminalEvent(sse, eventType, {
                    instanceId,
                    status: instance.status,
                    completionReason: instance.completion_reason,
                    durationSeconds: instance.duration_seconds,
                    totalCost: instance.accumulated_cost_credits
                });

                return;
            }

            // Track event handler for cleanup
            const channel = `persona:${instanceId}:events`;
            let subscribed = false;

            const messageHandler = (event: Record<string, unknown>): void => {
                const eventType = event.type as string;

                logger.debug({ instanceId, eventType }, "Forwarding event to client");

                if (TERMINAL_EVENTS.includes(eventType)) {
                    sendTerminalEvent(sse, eventType, event, () => {
                        redisEventBus
                            .unsubscribe(channel, messageHandler as (event: unknown) => void)
                            .catch(() => {});
                    });
                } else {
                    sse.sendEvent(eventType, event);
                }
            };

            // Handle client disconnect
            sse.onDisconnect(() => {
                logger.info({ instanceId }, "Client disconnected");
                if (subscribed) {
                    redisEventBus
                        .unsubscribe(channel, messageHandler as (event: unknown) => void)
                        .catch(() => {});
                }
            });

            // Subscribe to instance-specific Redis channel
            await redisEventBus.subscribe(channel, messageHandler as (event: unknown) => void);
            subscribed = true;

            // Send initial connected event with current state
            sse.sendEvent("connected", {
                instanceId,
                status: instance.status,
                progress: instance.progress,
                iterationCount: instance.iteration_count,
                accumulatedCost: instance.accumulated_cost_credits,
                isTerminal: false
            });

            logger.info({ instanceId }, "Stream handler initialized, waiting for events");
        }
    );
}
