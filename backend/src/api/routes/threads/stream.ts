/**
 * Thread-scoped Server-Sent Events (SSE) streaming endpoint
 *
 * Streams all events for a specific thread (across all executions)
 * Replaces the old execution-scoped SSE endpoint with thread-first routing
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { ThreadStreamingEvent } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { NotFoundError } from "../../middleware";

const logger = createServiceLogger("ThreadStream");

const streamParamsSchema = z.object({
    id: z.string().uuid()
});

/**
 * Stream thread events via Server-Sent Events
 * Thread-scoped: All events for this thread (across all executions)
 */
export async function streamThreadHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: threadId } = streamParamsSchema.parse(request.params);

    logger.info({ threadId, userId }, "Stream request received");

    const threadRepo = new ThreadRepository();

    // Verify thread exists and belongs to user
    const thread = await threadRepo.findById(threadId);
    if (!thread || thread.user_id !== userId) {
        throw new NotFoundError("Thread not found");
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no" // Disable nginx buffering
    });

    // Keep-alive ping (every 15 seconds)
    const keepAliveInterval = setInterval(() => {
        if (!clientDisconnected) {
            try {
                reply.raw.write(": keepalive\n\n");
            } catch {
                clientDisconnected = true;
            }
        }
    }, 15000);

    let clientDisconnected = false;

    // Handle client disconnect
    request.raw.on("close", () => {
        logger.info({ threadId }, "Client disconnected");
        clientDisconnected = true;
        clearInterval(keepAliveInterval);
        cleanup();
    });

    // Send SSE event to client
    const sendEvent = (event: ThreadStreamingEvent): void => {
        if (clientDisconnected) return;

        const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        try {
            reply.raw.write(sseData);
        } catch (error) {
            logger.error({ threadId, error }, "Error writing event");
            clientDisconnected = true;
        }
    };

    // Subscribe to thread-specific Redis channel
    const eventHandler = (event: ThreadStreamingEvent) => {
        logger.debug({
            threadId,
            eventType: event.type,
            executionId: event.executionId
        }, "Received event for thread");
        sendEvent(event);
    };

    await redisEventBus.subscribeToThread(threadId, eventHandler);

    const cleanup = () => {
        redisEventBus.unsubscribeFromThread(threadId, eventHandler);
        clearInterval(keepAliveInterval);
    };

    logger.info({ threadId }, "Stream started");

    // Note: Connection stays open until client disconnects
    // No explicit end - SSE is a long-lived connection
}
