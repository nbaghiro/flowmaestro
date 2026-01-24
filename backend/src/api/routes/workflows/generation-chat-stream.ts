/**
 * Generation Chat Stream Handler
 *
 * SSE endpoint for streaming workflow generation chat responses
 * with extended thinking support.
 */

import { EventEmitter } from "events";
import { FastifyRequest, FastifyReply } from "fastify";
import type { GenerationChatResponse, WorkflowPlan } from "@flowmaestro/shared";
import { createSSEHandler, sendTerminalEvent } from "../../../services/sse";

interface StreamParams {
    executionId: string;
}

interface StreamQuerystring {
    token?: string;
}

// In-memory store for execution streams
const executionStreams = new Map<string, EventEmitter>();

/**
 * SSE event types for generation chat
 */
export type GenerationStreamEventType =
    | "connected"
    | "thinking_start"
    | "thinking_token"
    | "thinking_complete"
    | "token"
    | "plan_detected"
    | "complete"
    | "error";

/**
 * SSE stream handler for generation chat
 */
export async function generationChatStreamHandler(
    request: FastifyRequest<{ Params: StreamParams; Querystring: StreamQuerystring }>,
    reply: FastifyReply
): Promise<void> {
    const { executionId } = request.params;

    // Hijack the reply to prevent Fastify from closing the connection
    reply.hijack();

    // Disable TCP buffering for immediate transmission
    if (request.raw.socket) {
        request.raw.socket.setNoDelay(true);
        request.raw.socket.setKeepAlive(true);
    }

    // Create SSE handler with CORS headers
    // Use request origin directly - security is handled by JWT auth
    const origin = request.headers.origin || "*";

    const sse = createSSEHandler(request, reply, {
        keepAliveInterval: 15000,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true"
        }
    });

    // Get or create event emitter for this execution
    let emitter = executionStreams.get(executionId);
    if (!emitter) {
        emitter = new EventEmitter();
        executionStreams.set(executionId, emitter);
    }

    // Setup event listeners
    const onThinkingStart = (): void => {
        sse.sendEvent("thinking_start", { timestamp: Date.now() });
    };

    const onThinkingToken = (token: string): void => {
        sse.sendEvent("thinking_token", { token });
    };

    const onThinkingComplete = (content: string): void => {
        sse.sendEvent("thinking_complete", { content, timestamp: Date.now() });
    };

    const onToken = (token: string): void => {
        sse.sendEvent("token", { token });
    };

    const onPlanDetected = (plan: WorkflowPlan): void => {
        sse.sendEvent("plan_detected", { plan });
    };

    const onComplete = (data: GenerationChatResponse): void => {
        sendTerminalEvent(sse, "complete", data as unknown as Record<string, unknown>, cleanup);
    };

    const onError = (error: Error | string): void => {
        const message = typeof error === "string" ? error : error.message;
        sendTerminalEvent(sse, "error", { message }, cleanup);
    };

    const cleanup = (): void => {
        emitter?.removeListener("thinking_start", onThinkingStart);
        emitter?.removeListener("thinking_token", onThinkingToken);
        emitter?.removeListener("thinking_complete", onThinkingComplete);
        emitter?.removeListener("token", onToken);
        emitter?.removeListener("plan_detected", onPlanDetected);
        emitter?.removeListener("complete", onComplete);
        emitter?.removeListener("error", onError);
        executionStreams.delete(executionId);
    };

    // Attach listeners
    emitter.on("thinking_start", onThinkingStart);
    emitter.on("thinking_token", onThinkingToken);
    emitter.on("thinking_complete", onThinkingComplete);
    emitter.on("token", onToken);
    emitter.on("plan_detected", onPlanDetected);
    emitter.on("complete", onComplete);
    emitter.on("error", onError);

    // Handle client disconnect
    sse.onDisconnect(cleanup);

    // Send initial connected event
    sse.sendEvent("connected", { executionId });
}

/**
 * Emit events to the generation chat stream
 */
export function emitGenerationEvent(
    executionId: string,
    event: GenerationStreamEventType,
    data: unknown
): void {
    const emitter = executionStreams.get(executionId);
    if (emitter) {
        emitter.emit(event, data);
    }
}
