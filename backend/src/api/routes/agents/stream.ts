import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { NotFoundError } from "../../middleware";

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

    // Set SSE headers
    const origin = request.headers.origin;
    const allowedOrigins = ["http://localhost:3000"];
    const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

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
        console.log(`[SSE Stream] Client disconnected for execution ${executionId}`);
        clientDisconnected = true;
        clearInterval(keepAliveInterval);
        unsubscribeAll();
    });

    request.raw.on("error", (error) => {
        console.error(`[SSE Stream] Request error for execution ${executionId}:`, error);
        clientDisconnected = true;
        clearInterval(keepAliveInterval);
        unsubscribeAll();
    });

    // Helper function to send SSE event
    const sendEvent = (event: string, data: Record<string, unknown>): void => {
        if (clientDisconnected) return;

        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        console.log(`[SSE Stream] Writing SSE event: ${event}`, data);
        try {
            reply.raw.write(message);
        } catch (error) {
            console.error(`[SSE Stream] Error writing SSE event ${event}:`, error);
            clientDisconnected = true;
        }
    };

    // Subscribe to Redis events for this execution
    const eventHandlers: Array<{
        channel: string;
        handler: (data: Record<string, unknown>) => void;
    }> = [];

    const subscribe = (
        eventType: string,
        handler: (data: Record<string, unknown>) => void
    ): void => {
        const channel = `agent:events:${eventType}`;
        console.log(`[SSE Stream] Subscribing to channel: ${channel} for execution ${executionId}`);
        eventHandlers.push({ channel, handler });
        redisEventBus.subscribe(channel, (event: unknown) => {
            const eventData = event as Record<string, unknown>;
            console.log(`[SSE Stream] Received event on channel ${channel}:`, {
                type: eventData.type,
                executionId: eventData.executionId,
                hasToken: !!eventData.token
            });
            handler(eventData);
        });
    };

    const unsubscribeAll = (): void => {
        eventHandlers.forEach(({ channel, handler }) => {
            redisEventBus.unsubscribe(channel, handler);
        });
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
        console.log(
            `[SSE Stream] Received token event for execution ${data.executionId}, current: ${executionId}`
        );
        if (data.executionId === executionId) {
            console.log(`[SSE Stream] Sending token to client: "${data.token}"`);
            sendEvent("token", {
                token: data.token,
                executionId: data.executionId
            });
        } else {
            console.log(
                `[SSE Stream] Token event executionId mismatch: ${data.executionId} !== ${executionId}`
            );
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
        console.log(
            `[SSE Stream] Received execution:completed event for execution ${data.executionId}, current execution: ${executionId}`
        );
        console.log("[SSE Stream] Completed event data:", JSON.stringify(data, null, 2));
        if (data.executionId === executionId) {
            console.log("[SSE Stream] Sending completed event to client");
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
        console.log(
            `[SSE Stream] Received execution:failed event for execution ${data.executionId}`
        );
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

    // Send initial connection event
    console.log(`[SSE Stream] Sending connected event for execution ${executionId}`);
    sendEvent("connected", {
        executionId,
        status: execution.status
    });

    console.log(`[SSE Stream] Stream handler initialized for execution ${executionId}`);
}
