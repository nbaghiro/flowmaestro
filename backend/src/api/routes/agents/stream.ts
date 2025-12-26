import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { ThreadStreamingEvent } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
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

    // Set SSE headers - use config.cors.origin for allowed origins
    const origin = request.headers.origin;
    const corsOrigin =
        origin && config.cors.origin.includes(origin) ? origin : config.cors.origin[0];

    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Cache-Control"
    });

    // Keep connection alive
    const keepAliveInterval = setInterval(() => {
        reply.raw.write(": keepalive\n\n");
    }, 15000); // Every 15 seconds

    // Track if client disconnected
    let clientDisconnected = false;

    // Handle client disconnect
    request.raw.on("close", () => {
        logger.info({ executionId }, "Client disconnected");
        clientDisconnected = true;
        clearInterval(keepAliveInterval);
        unsubscribeAll();
    });

    request.raw.on("error", (error) => {
        logger.error({ executionId, error }, "Request error");
        clientDisconnected = true;
        clearInterval(keepAliveInterval);
        unsubscribeAll();
    });

    // Helper function to send SSE event
    const sendEvent = (event: string, data: Record<string, unknown>): void => {
        if (clientDisconnected) return;

        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        logger.debug({ event, data }, "Writing SSE event");
        try {
            reply.raw.write(message);
        } catch (error) {
            logger.error({ event, error }, "Error writing SSE event");
            clientDisconnected = true;
        }
    };

    // Subscribe to Redis events for this execution
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
            logger.debug({
                channel,
                type: eventData.type,
                executionId: eventData.executionId,
                hasToken: !!eventData.token
            }, "Received event on channel");
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

    // Subscribe to relevant events
    subscribe("started", (data) => {
        if (data.executionId === executionId) {
            sendEvent("started", {
                executionId: data.executionId,
                agentName: data.agentName
            });
        }
    });

    subscribe("thinking", (data) => {
        if (data.executionId === executionId) {
            sendEvent("thinking", { executionId: data.executionId });
        }
    });

    subscribe("token", (data) => {
        logger.debug({
            receivedExecutionId: data.executionId,
            currentExecutionId: executionId
        }, "Received token event");
        if (data.executionId === executionId) {
            logger.debug({ token: data.token }, "Sending token to client");
            sendEvent("token", {
                token: data.token,
                executionId: data.executionId
            });
        } else {
            logger.debug({
                receivedExecutionId: data.executionId,
                expectedExecutionId: executionId
            }, "Token event executionId mismatch");
        }
    });

    subscribe("message", (data) => {
        if (data.executionId === executionId) {
            sendEvent("message", {
                message: data.message,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_started", (data) => {
        if (data.executionId === executionId) {
            sendEvent("tool_call_started", {
                toolName: data.toolName,
                arguments: data.arguments,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_completed", (data) => {
        if (data.executionId === executionId) {
            sendEvent("tool_call_completed", {
                toolName: data.toolName,
                result: data.result,
                executionId: data.executionId
            });
        }
    });

    subscribe("tool_call_failed", (data) => {
        if (data.executionId === executionId) {
            sendEvent("tool_call_failed", {
                toolName: data.toolName,
                error: data.error,
                executionId: data.executionId
            });
        }
    });

    subscribe("execution:completed", (data) => {
        logger.info({
            receivedExecutionId: data.executionId,
            currentExecutionId: executionId,
            data
        }, "Received execution:completed event");
        if (data.executionId === executionId) {
            logger.info({ executionId }, "Sending completed event to client");
            sendEvent("completed", {
                finalMessage: data.finalMessage,
                iterations: data.iterations,
                executionId: data.executionId
            });

            // Close connection after completion
            setTimeout(() => {
                clearInterval(keepAliveInterval);
                unsubscribeAll();
                reply.raw.end();
            }, 500);
        }
    });

    subscribe("execution:failed", (data) => {
        logger.error({ executionId: data.executionId }, "Received execution:failed event");
        if (data.executionId === executionId) {
            sendEvent("error", {
                error: data.error,
                executionId: data.executionId
            });

            // Close connection after error
            setTimeout(() => {
                clearInterval(keepAliveInterval);
                unsubscribeAll();
                reply.raw.end();
            }, 500);
        }
    });

    // Also listen on the thread-scoped stream for token usage updates
    const threadHandler = (event: ThreadStreamingEvent) => {
        if (event.type === "thread:tokens:updated" && event.executionId === executionId) {
            // Spread to satisfy Record<string, unknown> requirement on sendEvent
            sendEvent("thread:tokens:updated", { ...event });
        }
    };

    await redisEventBus.subscribeToThread(threadId, threadHandler);
    threadUnsubscribe = async () => {
        await redisEventBus.unsubscribeFromThread(threadId, threadHandler);
    };

    // Send initial connection event
    sendEvent("connected", {
        executionId,
        status: execution.status
    });

    logger.info({ executionId }, "Stream handler initialized");
}
