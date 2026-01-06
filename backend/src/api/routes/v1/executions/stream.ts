import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { WebSocketEvent } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import { redisEventBus } from "../../../../services/events/RedisEventBus";
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

            // If execution is already completed/failed, send final event and close
            if (
                execution.status === "completed" ||
                execution.status === "failed" ||
                execution.status === "cancelled"
            ) {
                reply.raw.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                    "X-Accel-Buffering": "no"
                });

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

                reply.raw.write(`event: ${eventType}\n`);
                reply.raw.write(`data: ${JSON.stringify(eventData)}\n\n`);
                reply.raw.end();
                return;
            }

            // Set up SSE
            reply.raw.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no"
            });

            // Send initial connection event
            reply.raw.write("event: connected\n");
            reply.raw.write(
                `data: ${JSON.stringify({ execution_id: executionId, status: execution.status })}\n\n`
            );

            // Subscribe to execution events
            const channel = `execution:${executionId}:*`;

            const messageHandler = (event: WebSocketEvent) => {
                try {
                    const eventType = event.type || "execution:progress";

                    reply.raw.write(`event: ${eventType}\n`);
                    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

                    // Close connection on terminal events
                    const terminalEvents = [
                        "execution:completed",
                        "execution:failed",
                        "execution:cancelled"
                    ];
                    if (terminalEvents.includes(eventType)) {
                        setTimeout(() => {
                            redisEventBus.unsubscribe(channel, messageHandler).catch(() => {});
                            reply.raw.end();
                        }, 100);
                    }
                } catch (error) {
                    logger.error({ error, executionId }, "Failed to handle execution event");
                }
            };

            await redisEventBus.subscribe(channel, messageHandler);

            // Handle client disconnect
            request.raw.on("close", () => {
                redisEventBus.unsubscribe(channel, messageHandler).catch(() => {});
                logger.debug({ executionId, userId }, "Client disconnected from execution stream");
            });

            // Keep connection alive with periodic heartbeat
            const heartbeatInterval = setInterval(() => {
                try {
                    reply.raw.write(":heartbeat\n\n");
                } catch {
                    clearInterval(heartbeatInterval);
                }
            }, 30000);

            request.raw.on("close", () => {
                clearInterval(heartbeatInterval);
            });
        }
    );
}
