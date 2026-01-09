/**
 * Generation Chat Stream Handler
 *
 * SSE endpoint for streaming workflow generation chat responses
 * with extended thinking support.
 */

import { EventEmitter } from "events";
import { FastifyRequest, FastifyReply } from "fastify";
import type { GenerationChatResponse, WorkflowPlan } from "@flowmaestro/shared";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";

const logger = createServiceLogger("GenerationChatStream");

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

    // Setup SSE headers with CORS
    const origin = request.headers.origin;
    const corsOrigin =
        origin && config.cors.origin.includes(origin) ? origin : config.cors.origin[0];

    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true"
    });

    const sendEvent = (event: GenerationStreamEventType, data: Record<string, unknown>): void => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        const written = reply.raw.write(message);

        if (!written && (event === "token" || event === "thinking_token")) {
            logger.warn({ executionId, event }, "Write buffer full - backpressure detected");
        }
    };

    // Get or create event emitter for this execution
    let emitter = executionStreams.get(executionId);
    if (!emitter) {
        emitter = new EventEmitter();
        executionStreams.set(executionId, emitter);
    }

    // Setup event listeners
    const onThinkingStart = (): void => {
        sendEvent("thinking_start", { timestamp: Date.now() });
    };

    const onThinkingToken = (token: string): void => {
        sendEvent("thinking_token", { token });
    };

    const onThinkingComplete = (content: string): void => {
        sendEvent("thinking_complete", { content, timestamp: Date.now() });
    };

    const onToken = (token: string): void => {
        sendEvent("token", { token });
    };

    const onPlanDetected = (plan: WorkflowPlan): void => {
        sendEvent("plan_detected", { plan });
    };

    const onComplete = (data: GenerationChatResponse): void => {
        sendEvent("complete", data as unknown as Record<string, unknown>);
        cleanup();
    };

    const onError = (error: Error | string): void => {
        const message = typeof error === "string" ? error : error.message;
        sendEvent("error", { message });
        cleanup();
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
        reply.raw.end();
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
    request.raw.on("close", cleanup);

    // Send initial connected event
    sendEvent("connected", { executionId });
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
