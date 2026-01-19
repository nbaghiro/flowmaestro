import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { WebSocketEvent } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import { redisEventBus } from "../../../../services/events/RedisEventBus";
import { createSSEHandler, sendTerminalEvent } from "../../../../services/sse";
import { ExecutionRepository } from "../../../../storage/repositories/ExecutionRepository";
import { WorkflowRepository } from "../../../../storage/repositories/WorkflowRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendNotFound } from "../response-helpers";

const logger = createServiceLogger("PublicApiExecutionStream");

interface StreamExecutionParams {
    id: string;
}

/**
 * GET /api/v1/executions/:id/events
 *
 * Stream execution events via Server-Sent Events (SSE).
 *
 * Required scope: executions:read
 *
 * Events:
 * - execution:started - Execution started
 * - execution:progress - Progress update
 * - node:started - Node execution started
 * - node:completed - Node execution completed
 * - node:failed - Node execution failed
 * - execution:completed - Execution completed successfully
 * - execution:failed - Execution failed
 */
export async function streamExecutionHandler(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Params: StreamExecutionParams }>(
        "/:id/events",
        {
            preHandler: [requireScopes("executions:read")]
        },
        async (request: FastifyRequest<{ Params: StreamExecutionParams }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const executionId = request.params.id;

            const executionRepo = new ExecutionRepository();
            const workflowRepo = new WorkflowRepository();

            // Verify execution exists and belongs to user
            const execution = await executionRepo.findById(executionId);
            if (!execution) {
                return sendNotFound(reply, "Execution", executionId);
            }

            const workflow = await workflowRepo.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== userId) {
                return sendNotFound(reply, "Execution", executionId);
            }

            // Create SSE handler
            const sse = createSSEHandler(request, reply, {
                keepAliveInterval: 30000
            });

            // If execution is already completed/failed, send final event and close
            if (
                execution.status === "completed" ||
                execution.status === "failed" ||
                execution.status === "cancelled"
            ) {
                const eventData = {
                    execution_id: executionId,
                    status: execution.status,
                    outputs: execution.outputs,
                    error: execution.error,
                    completed_at: execution.completed_at?.toISOString()
                };

                const eventType =
                    execution.status === "completed"
                        ? "execution:completed"
                        : execution.status === "failed"
                          ? "execution:failed"
                          : "execution:cancelled";

                sendTerminalEvent(sse, eventType, eventData);
                return;
            }

            // Subscribe to execution events
            const channel = `execution:${executionId}:*`;

            const messageHandler = (event: WebSocketEvent) => {
                try {
                    const eventType = event.type || "execution:progress";

                    // Check for terminal events
                    const terminalEvents = [
                        "execution:completed",
                        "execution:failed",
                        "execution:cancelled"
                    ];

                    if (terminalEvents.includes(eventType)) {
                        // Send event first, then unsubscribe in cleanup callback
                        sendTerminalEvent(sse, eventType, event, () => {
                            redisEventBus.unsubscribe(channel, messageHandler).catch(() => {});
                        });
                    } else {
                        sse.sendEvent(eventType, event);
                    }
                } catch (error) {
                    logger.error({ error, executionId }, "Failed to handle execution event");
                }
            };

            await redisEventBus.subscribe(channel, messageHandler);

            // Handle client disconnect
            sse.onDisconnect(() => {
                redisEventBus.unsubscribe(channel, messageHandler).catch(() => {});
                logger.debug({ executionId, userId }, "Client disconnected from execution stream");
            });

            // Send initial connection event
            sse.sendEvent("connected", {
                execution_id: executionId,
                status: execution.status
            });
        }
    );
}
