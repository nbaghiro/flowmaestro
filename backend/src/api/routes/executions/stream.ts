/**
 * Execution Stream Route
 *
 * SSE endpoint for real-time execution updates.
 * GET /api/executions/:id/stream
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { sseManager } from "../../../temporal/core";
import { authMiddleware, validateParams, NotFoundError, UnauthorizedError } from "../../middleware";
import { executionIdParamSchema } from "../../schemas/execution-schemas";

const logger = createServiceLogger("SSEStreamRoute");

interface StreamExecutionParams {
    id: string;
}

interface StreamExecutionQuery {
    lastEventId?: string;
}

export async function streamExecutionRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{
        Params: StreamExecutionParams;
        Querystring: StreamExecutionQuery;
    }>(
        "/:id/stream",
        {
            preHandler: [authMiddleware, validateParams(executionIdParamSchema)]
        },
        async (
            request: FastifyRequest<{
                Params: StreamExecutionParams;
                Querystring: StreamExecutionQuery;
            }>,
            reply: FastifyReply
        ) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id: executionId } = request.params;
            const { lastEventId } = request.query;
            const userId = request.user!.id;

            // Verify execution exists
            const execution = await executionRepository.findById(executionId);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Verify user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);

            if (!workflow || workflow.user_id !== userId) {
                throw new UnauthorizedError("Not authorized to stream this execution");
            }

            logger.info({ executionId, userId, lastEventId }, "SSE connection established");

            // Add connection to SSE manager
            // This sets up the SSE headers and handles the connection lifecycle
            sseManager.addConnection(executionId, userId, reply, lastEventId);

            // The connection stays open until the client disconnects
            // or the execution completes
            // The sseManager handles cleanup on connection close

            // Return a promise that never resolves to keep connection open
            // Fastify will handle the raw response via reply.raw
            return new Promise(() => {
                // Connection cleanup is handled by sseManager via reply.raw.on("close")
            });
        }
    );
}

/**
 * Broadcast an execution event to all connected clients.
 * This should be called from the workflow orchestrator.
 */
export function broadcastExecutionEvent(
    executionId: string,
    eventType: Parameters<typeof sseManager.broadcast>[1],
    data: Parameters<typeof sseManager.broadcast>[2]
): void {
    sseManager.broadcast(executionId, eventType, data);
}

/**
 * Get the number of active SSE connections for an execution.
 */
export function getExecutionConnectionCount(executionId: string): number {
    return sseManager.getConnectionCount(executionId);
}

/**
 * Get overall SSE connection statistics.
 */
export function getSSEStats(): ReturnType<typeof sseManager.getStats> {
    return sseManager.getStats();
}
