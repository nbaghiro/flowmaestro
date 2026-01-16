/**
 * Execution Stream Route
 *
 * SSE endpoint for real-time execution updates.
 * GET /api/executions/:id/stream
 *
 * Subscribes to Redis events for the execution and forwards them to the client.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, NotFoundError, UnauthorizedError } from "../../middleware";
import { executionIdParamSchema } from "../../schemas/execution-schemas";

const logger = createServiceLogger("SSEStreamRoute");

interface StreamExecutionParams {
    id: string;
}

export async function streamExecutionRoute(fastify: FastifyInstance): Promise<void> {
    fastify.get<{
        Params: StreamExecutionParams;
    }>(
        "/:id/stream",
        {
            preHandler: [authMiddleware, validateParams(executionIdParamSchema)]
        },
        async (
            request: FastifyRequest<{
                Params: StreamExecutionParams;
            }>,
            reply: FastifyReply
        ) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id: executionId } = request.params;
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

            logger.info({ executionId, userId }, "SSE connection established");

            // Set up SSE headers
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

            // Track if client disconnected
            let clientDisconnected = false;

            // Keep connection alive
            const keepAliveInterval = setInterval(() => {
                if (!clientDisconnected) {
                    try {
                        reply.raw.write(": keepalive\n\n");
                    } catch {
                        clientDisconnected = true;
                        clearInterval(keepAliveInterval);
                    }
                }
            }, 15000);

            // Helper function to send SSE event
            const sendEvent = (event: string, data: Record<string, unknown>): void => {
                if (clientDisconnected) return;

                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                try {
                    reply.raw.write(message);
                } catch (error) {
                    logger.error({ event, error }, "Error writing SSE event");
                    clientDisconnected = true;
                }
            };

            // Subscribe to workflow events for this execution
            const eventHandlers: Array<{
                channel: string;
                handler: (data: Record<string, unknown>) => void;
            }> = [];

            const subscribe = (
                eventType: string,
                handler: (data: Record<string, unknown>) => void
            ): void => {
                const channel = `workflow:events:${eventType}`;
                logger.debug({ channel, executionId }, "Subscribing to channel");
                eventHandlers.push({ channel, handler });
                redisEventBus.subscribe(channel, (event: unknown) => {
                    const eventData = event as Record<string, unknown>;
                    handler(eventData);
                });
            };

            const unsubscribeAll = (): void => {
                logger.debug({ executionId }, "Unsubscribing from all channels");
                eventHandlers.forEach(({ channel, handler }) => {
                    redisEventBus.unsubscribe(channel, handler);
                });
            };

            // Handle client disconnect
            request.raw.on("close", () => {
                logger.info({ executionId }, "Client disconnected");
                clientDisconnected = true;
                clearInterval(keepAliveInterval);
                unsubscribeAll();
            });

            request.raw.on("error", (error) => {
                logger.error({ executionId, error }, "Request error");
                clientDisconnected = true;
                clearInterval(keepAliveInterval);
                unsubscribeAll();
            });

            // Subscribe to execution events
            subscribe("execution:started", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("execution:started", {
                        executionId: data.executionId,
                        workflowName: data.workflowName,
                        totalNodes: data.totalNodes
                    });
                }
            });

            subscribe("execution:progress", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("execution:progress", {
                        executionId: data.executionId,
                        completed: data.completed,
                        total: data.total,
                        percentage: data.percentage
                    });
                }
            });

            subscribe("execution:completed", (data) => {
                if (data.executionId === executionId) {
                    logger.info({ executionId }, "Sending completed event to client");
                    sendEvent("execution:completed", {
                        executionId: data.executionId,
                        duration: data.duration,
                        outputs: data.outputs
                    });

                    // Close connection after completion
                    setTimeout(() => {
                        clearInterval(keepAliveInterval);
                        unsubscribeAll();
                        reply.raw.end();
                    }, 500);
                }
            });

            subscribe("execution:failed", (data) => {
                if (data.executionId === executionId) {
                    logger.error({ executionId }, "Sending failed event to client");
                    sendEvent("execution:failed", {
                        executionId: data.executionId,
                        error: data.error
                    });

                    // Close connection after failure
                    setTimeout(() => {
                        clearInterval(keepAliveInterval);
                        unsubscribeAll();
                        reply.raw.end();
                    }, 500);
                }
            });

            subscribe("execution:paused", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("execution:paused", {
                        executionId: data.executionId,
                        reason: data.reason,
                        nodeId: data.nodeId,
                        nodeName: data.nodeName,
                        pauseContext: data.pauseContext
                    });
                }
            });

            // Subscribe to node events
            subscribe("node:started", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("node:started", {
                        executionId: data.executionId,
                        nodeId: data.nodeId,
                        nodeName: data.nodeName,
                        nodeType: data.nodeType,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("node:completed", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("node:completed", {
                        executionId: data.executionId,
                        nodeId: data.nodeId,
                        nodeName: data.nodeName,
                        nodeType: data.nodeType,
                        output: data.output,
                        duration: data.duration,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("node:failed", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("node:failed", {
                        executionId: data.executionId,
                        nodeId: data.nodeId,
                        nodeName: data.nodeName,
                        nodeType: data.nodeType,
                        error: data.error,
                        timestamp: data.timestamp
                    });
                }
            });

            subscribe("node:retry", (data) => {
                if (data.executionId === executionId) {
                    sendEvent("node:retry", {
                        executionId: data.executionId,
                        nodeId: data.nodeId,
                        nodeName: data.nodeName,
                        attempt: data.attempt,
                        error: data.error
                    });
                }
            });

            // If execution is already completed/failed, send final event and close
            if (
                execution.status === "completed" ||
                execution.status === "failed" ||
                execution.status === "cancelled"
            ) {
                const eventType =
                    execution.status === "completed"
                        ? "execution:completed"
                        : execution.status === "failed"
                          ? "execution:failed"
                          : "execution:cancelled";

                sendEvent(eventType, {
                    executionId,
                    status: execution.status,
                    outputs: execution.outputs,
                    error: execution.error
                });

                setTimeout(() => {
                    clearInterval(keepAliveInterval);
                    unsubscribeAll();
                    reply.raw.end();
                }, 500);

                return;
            }

            // Send initial connected event
            sendEvent("connected", {
                executionId,
                status: execution.status
            });

            logger.info({ executionId }, "Stream handler initialized, waiting for events");

            // Return a promise that never resolves to keep connection open
            // The connection will be closed when:
            // 1. Client disconnects
            // 2. Execution completes/fails
            return new Promise(() => {});
        }
    );
}
