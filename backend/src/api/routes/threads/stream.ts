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
import { createSSEHandler } from "../../../services/sse";
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
    const workspaceId = request.workspace!.id;
    const { id: threadId } = streamParamsSchema.parse(request.params);

    logger.info({ threadId, workspaceId }, "Stream request received");

    const threadRepo = new ThreadRepository();

    // Verify thread exists and belongs to workspace
    const thread = await threadRepo.findByIdAndWorkspaceId(threadId, workspaceId);
    if (!thread) {
        throw new NotFoundError("Thread not found");
    }

    // Create SSE handler
    const sse = createSSEHandler(request, reply, {
        keepAliveInterval: 15000
    });

    // Subscribe to thread-specific Redis channel
    const eventHandler = (event: ThreadStreamingEvent) => {
        logger.debug(
            {
                threadId,
                eventType: event.type,
                executionId: event.executionId
            },
            "Received event for thread"
        );
        sse.sendEvent(event.type, { ...event });
    };

    await redisEventBus.subscribeToThread(threadId, eventHandler);

    // Handle client disconnect
    sse.onDisconnect(() => {
        logger.info({ threadId }, "Client disconnected");
        redisEventBus.unsubscribeFromThread(threadId, eventHandler);
    });

    logger.info({ threadId }, "Stream started");

    // Note: Connection stays open until client disconnects
    // No explicit end - SSE is a long-lived connection
}
