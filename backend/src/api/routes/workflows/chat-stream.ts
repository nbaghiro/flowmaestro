import { EventEmitter } from "events";
import { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../../core/config";
import { createSSEHandler, sendTerminalEvent } from "../../../services/sse";

interface StreamParams {
    executionId: string;
}

interface StreamQuerystring {
    token?: string;
}

// In-memory store for execution streams (could use Redis for multi-instance)
const executionStreams = new Map<string, EventEmitter>();

export async function chatStreamHandler(
    request: FastifyRequest<{ Params: StreamParams; Querystring: StreamQuerystring }>,
    reply: FastifyReply
): Promise<void> {
    const { executionId } = request.params;

    // User is verified by authMiddleware (supports both header and query param token)
    // TODO: Verify executionId belongs to user's workflow using request.user.id

    // Hijack the reply to prevent Fastify from closing the connection
    reply.hijack();

    // Disable TCP buffering (Nagle's algorithm) for immediate transmission
    if (request.raw.socket) {
        request.raw.socket.setNoDelay(true);
        request.raw.socket.setKeepAlive(true);
    }

    // Create SSE handler with CORS headers
    const origin = request.headers.origin;
    const corsOrigin =
        origin && config.cors.origin.includes(origin) ? origin : config.cors.origin[0];

    const sse = createSSEHandler(request, reply, {
        keepAliveInterval: 15000,
        headers: {
            "Access-Control-Allow-Origin": corsOrigin,
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
        sse.sendEvent("thinking_start", {});
    };

    const onThinkingToken = (token: string): void => {
        sse.sendEvent("thinking_token", { token });
    };

    const onThinkingComplete = (content: string): void => {
        sse.sendEvent("thinking_complete", { content });
    };

    const onToken = (token: string): void => {
        sse.sendEvent("token", { token });
    };

    const onComplete = (data: { response: string; changes?: unknown; thinking?: string }): void => {
        sendTerminalEvent(sse, "complete", data, cleanup);
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
        emitter?.removeListener("complete", onComplete);
        emitter?.removeListener("error", onError);
        executionStreams.delete(executionId);
    };

    // Attach listeners
    emitter.on("thinking_start", onThinkingStart);
    emitter.on("thinking_token", onThinkingToken);
    emitter.on("thinking_complete", onThinkingComplete);
    emitter.on("token", onToken);
    emitter.on("complete", onComplete);
    emitter.on("error", onError);

    // Handle client disconnect
    sse.onDisconnect(cleanup);

    // Send initial connected event
    sse.sendEvent("connected", { executionId });
}

// Export helper to emit events from WorkflowChatService
export function emitChatEvent(
    executionId: string,
    event:
        | "thinking_start"
        | "thinking_token"
        | "thinking_complete"
        | "token"
        | "complete"
        | "error",
    data: unknown
): void {
    const emitter = executionStreams.get(executionId);
    if (emitter) {
        emitter.emit(event, data);
    }
}
