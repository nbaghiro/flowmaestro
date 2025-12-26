import { EventEmitter } from "events";
import { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";

const logger = createServiceLogger("ChatStream");

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

    // Setup SSE headers with CORS - use config.cors.origin for allowed origins
    const origin = request.headers.origin;
    const corsOrigin =
        origin && config.cors.origin.includes(origin) ? origin : config.cors.origin[0];

    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Credentials": "true"
    });

    const sendEvent = (event: string, data: Record<string, unknown>): void => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        const written = reply.raw.write(message);

        // Debug: Log if write buffer is full (indicates backpressure)
        if (!written && event === "token") {
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
    const onToken = (token: string): void => {
        sendEvent("token", { token });
    };

    const onComplete = (data: { response: string; changes?: unknown }): void => {
        sendEvent("complete", data);
        cleanup();
    };

    const onError = (error: Error | string): void => {
        const message = typeof error === "string" ? error : error.message;
        sendEvent("error", { message });
        cleanup();
    };

    const cleanup = (): void => {
        emitter?.removeListener("token", onToken);
        emitter?.removeListener("complete", onComplete);
        emitter?.removeListener("error", onError);
        executionStreams.delete(executionId);
        reply.raw.end();
    };

    // Attach listeners
    emitter.on("token", onToken);
    emitter.on("complete", onComplete);
    emitter.on("error", onError);

    // Handle client disconnect
    request.raw.on("close", cleanup);

    // Send initial connected event
    sendEvent("connected", { executionId });
}

// Export helper to emit events from WorkflowChatService
export function emitChatEvent(
    executionId: string,
    event: "token" | "complete" | "error",
    data: unknown
): void {
    const emitter = executionStreams.get(executionId);
    if (emitter) {
        emitter.emit(event, data);
    }
}
