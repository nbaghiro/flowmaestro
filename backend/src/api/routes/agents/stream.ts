import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { ThreadStreamingEvent } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { createSSEHandler, sendTerminalEvent } from "../../../services/sse";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { NotFoundError } from "../../middleware";

const logger = createServiceLogger("SSEStream");

const streamParamsSchema = z.object({
    id: z.string().uuid(),
    executionId: z.string().uuid()
});

/**
 * Stream agent execution updates via Server-Sent Events
 * This endpoint provides real-time token-by-token streaming of agent responses
 */
export async function streamAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: agentId, executionId } = streamParamsSchema.parse(request.params);

    const executionRepo = new AgentExecutionRepository();

    // Verify execution exists and belongs to user
    const execution = await executionRepo.findById(executionId);
    if (!execution || execution.user_id !== userId || execution.agent_id !== agentId) {
        throw new NotFoundError("Execution not found");
    }
    const threadId = execution.thread_id;

    // Create SSE handler with CORS headers
    const origin = request.headers.origin;
    const corsOrigin =
        origin && config.cors.origin.includes(origin) ? origin : config.cors.origin[0];

    const sse = createSSEHandler(request, reply, {
        keepAliveInterval: 15000,
        headers: {
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    });

    // Track event handlers for cleanup
    const eventHandlers: Array<{
        channel: string;
        handler: (data: Record<string, unknown>) => void;
    }> = [];

    // Unsubscribe callback from thread channel when client disconnects
    let threadUnsubscribe: (() => Promise<void>) | null = null;

    const subscribe = (
        eventType: string,
        handler: (data: Record<string, unknown>) => void
    ): void => {
        const channel = `agent:events:${eventType}`;
        logger.debug({ channel, executionId }, "Subscribing to channel");
        eventHandlers.push({ channel, handler });
        redisEventBus.subscribe(channel, (event: unknown) => {
            const eventData = event as Record<string, unknown>;
            logger.debug(
                {
                    channel,
                    type: eventData.type,
                    executionId: eventData.executionId,
                    hasToken: !!eventData.token
                },
                "Received event on channel"
            );
            handler(eventData);
        });
    };

    const unsubscribeAll = (): void => {
        eventHandlers.forEach(({ channel, handler }) => {
            redisEventBus.unsubscribe(channel, handler);
        });
        if (threadUnsubscribe) {
            threadUnsubscribe().catch((error) =>
                logger.error({ error }, "Failed to unsubscribe from thread channel")
            );
        }
    };

    // Handle client disconnect
    sse.onDisconnect(() => {
        logger.info({ executionId }, "Client disconnected");
        unsubscribeAll();
    });

    // Subscribe to relevant events
    subscribe("started", (data) => {
        if (data.executionId === executionId) {
            sse.sendEvent("started", {
                executionId: data.executionId,
                agentName: data.agentName
            });
        }
    });

    subscribe("thinking", (data) => {
        if (data.executionId === executionId) {
            sse.sendEvent("thinking", { executionId: data.executionId });
        }
    });

    subscribe("token", (data) => {
        logger.debug(
            {
                receivedExecutionId: data.executionId,
                currentExecutionId: executionId
            },
            "Received token event"
        );
        if (data.executionId === executionId) {
            logger.debug({ token: data.token }, "Sending token to client");
            sse.sendEvent("token", {
                token: data.token,
                executionId: data.executionId
            });
        } else {
            logger.debug(
                {
                    receivedExecutionId: data.executionId,
                    expectedExecutionId: executionId
                },
                "Token event executionId mismatch"
            );
        }
    });

    subscribe("message", (data) => {
        if (data.executionId === executionId) {
            sse.sendEvent("message", {
                message: data.message,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_started", (data) => {
        if (data.executionId === executionId) {
            sse.sendEvent("tool_call_started", {
                toolName: data.toolName,
                arguments: data.arguments,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_completed", (data) => {
        if (data.executionId === executionId) {
            sse.sendEvent("tool_call_completed", {
                toolName: data.toolName,
                result: data.result,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_failed", (data) => {
        if (data.executionId === executionId) {
            sse.sendEvent("tool_call_failed", {
                toolName: data.toolName,
                error: data.error,
                executionId: data.executionId
            });
        }
    });

    subscribe("execution:completed", (data) => {
        logger.info(
            {
                receivedExecutionId: data.executionId,
                currentExecutionId: executionId,
                data
            },
            "Received execution:completed event"
        );
        if (data.executionId === executionId) {
            logger.info({ executionId }, "Sending completed event to client");
            sendTerminalEvent(
                sse,
                "completed",
                {
                    finalMessage: data.finalMessage,
                    iterations: data.iterations,
                    executionId: data.executionId
                },
                unsubscribeAll
            );
        }
    });

    subscribe("execution:failed", (data) => {
        logger.error({ executionId: data.executionId }, "Received execution:failed event");
        if (data.executionId === executionId) {
            sendTerminalEvent(
                sse,
                "error",
                {
                    error: data.error,
                    executionId: data.executionId
                },
                unsubscribeAll
            );
        }
    });

    // Also listen on the thread-scoped stream for token usage updates
    const threadHandler = (event: ThreadStreamingEvent) => {
        if (event.type === "thread:tokens:updated" && event.executionId === executionId) {
            sse.sendEvent("thread:tokens:updated", { ...event });
        }
    };

    await redisEventBus.subscribeToThread(threadId, threadHandler);
    threadUnsubscribe = async () => {
        await redisEventBus.unsubscribeFromThread(threadId, threadHandler);
    };

    // Send initial connection event
    sse.sendEvent("connected", {
        executionId,
        status: execution.status
    });

    logger.info({ executionId }, "Stream handler initialized");
}
