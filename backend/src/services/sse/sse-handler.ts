/**
 * SSE (Server-Sent Events) Handler Utilities
 *
 * Provides utilities for creating and managing SSE connections in Fastify routes.
 */

import type { FastifyRequest, FastifyReply } from "fastify";

export interface SSEHandlerConfig {
    /** Keep-alive interval in milliseconds (default: 30000) */
    keepAliveInterval?: number;
    /** Custom headers to add to the response */
    headers?: Record<string, string>;
}

export interface SSEContext {
    /** Send an SSE event to the client */
    sendEvent: (eventType: string, data: Record<string, unknown>) => void;
    /** Send a raw SSE comment (for keep-alive) */
    sendComment: (comment: string) => void;
    /** Close the SSE connection */
    close: () => void;
    /** Register a handler for when the connection is closed */
    onDisconnect: (handler: () => void) => void;
    /** Check if the connection is still open */
    isConnected: () => boolean;
}

/**
 * Creates an SSE handler context for a Fastify route.
 *
 * @example
 * ```typescript
 * fastify.get("/stream", async (request, reply) => {
 *     const sse = createSSEHandler(request, reply);
 *
 *     sse.onDisconnect(() => {
 *         console.log("Client disconnected");
 *     });
 *
 *     sse.sendEvent("connected", { message: "Hello" });
 *
 *     // Later...
 *     sse.sendEvent("update", { data: "some data" });
 * });
 * ```
 */
export function createSSEHandler(
    request: FastifyRequest,
    reply: FastifyReply,
    config: SSEHandlerConfig = {}
): SSEContext {
    const { keepAliveInterval = 30000, headers = {} } = config;

    let disconnected = false;
    let keepAliveTimer: NodeJS.Timeout | null = null;
    const disconnectHandlers: Array<() => void> = [];

    // Set SSE headers
    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
        ...headers
    });

    // Handle client disconnect
    request.raw.on("close", () => {
        disconnected = true;
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
        }
        disconnectHandlers.forEach((handler) => handler());
    });

    // Handle connection errors
    request.raw.on("error", (error: NodeJS.ErrnoException) => {
        // ECONNRESET is expected when client closes connection after receiving terminal event
        if (error.code !== "ECONNRESET") {
            // Log non-expected errors (would need logger passed in, so just silently handle)
        }
        disconnected = true;
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
        }
        disconnectHandlers.forEach((handler) => handler());
    });

    // Start keep-alive interval
    if (keepAliveInterval > 0) {
        keepAliveTimer = setInterval(() => {
            if (!disconnected) {
                // Use same format as original: `: keepalive\n\n`
                reply.raw.write(": keepalive\n\n");
            }
        }, keepAliveInterval);
    }

    const context: SSEContext = {
        sendEvent: (eventType: string, data: Record<string, unknown>) => {
            if (disconnected) return;

            // Write entire SSE message in a single write call (matches original implementation)
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            try {
                reply.raw.write(message);
            } catch {
                // Error writing - mark as disconnected
                disconnected = true;
            }
        },

        sendComment: (comment: string) => {
            if (disconnected) return;
            try {
                reply.raw.write(`: ${comment}\n\n`);
            } catch {
                disconnected = true;
            }
        },

        close: () => {
            if (disconnected) return;

            disconnected = true;
            if (keepAliveTimer) {
                clearInterval(keepAliveTimer);
                keepAliveTimer = null;
            }
            reply.raw.end();
        },

        onDisconnect: (handler: () => void) => {
            disconnectHandlers.push(handler);
        },

        isConnected: () => !disconnected
    };

    return context;
}

/**
 * Sends a terminal event and closes the SSE connection after a short delay.
 * The delay ensures the event data is flushed to the client before closing.
 * Use this for events like "completed", "failed", "error", etc.
 *
 * @param sse - The SSE context
 * @param eventType - The event type to send
 * @param data - The event data
 * @param cleanup - Optional cleanup function to call after sending but before closing
 */
export function sendTerminalEvent(
    sse: SSEContext,
    eventType: string,
    data: Record<string, unknown>,
    cleanup?: () => void
): void {
    // Send the event first
    sse.sendEvent(eventType, data);

    // Delay closing to ensure event is flushed to client (matches original 500ms delay)
    setTimeout(() => {
        // Run cleanup after event is sent but before closing
        cleanup?.();
        sse.close();
    }, 500);
}
