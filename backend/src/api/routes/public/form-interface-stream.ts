import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { ExecutionRepository } from "../../../storage/repositories/ExecutionRepository";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";

const logger = createServiceLogger("PublicFormInterfaceStream");

export async function publicFormInterfaceStreamRoutes(fastify: FastifyInstance) {
    const formInterfaceRepo = new FormInterfaceRepository();
    const submissionRepo = new FormInterfaceSubmissionRepository();

    /**
     * GET /api/public/form-interfaces/:slug/submissions/:submissionId/stream
     * Stream execution results for a form interface submission
     * No auth required (public endpoint)
     */
    fastify.get("/:slug/submissions/:submissionId/stream", async (request, reply) => {
        const { slug, submissionId } = request.params as {
            slug: string;
            submissionId: string;
        };

        try {
            // Find the form interface
            const formInterface = await formInterfaceRepo.findBySlug(slug);

            if (!formInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Form interface not found"
                });
            }

            // Find the submission
            const submission = await submissionRepo.findById(submissionId);

            if (!submission) {
                return reply.status(404).send({
                    success: false,
                    error: "Submission not found"
                });
            }

            // Validate submission belongs to this form interface
            if (submission.interfaceId !== formInterface.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Submission does not belong to this form interface"
                });
            }

            // Check if execution ID exists
            if (!submission.executionId) {
                return reply.status(400).send({
                    success: false,
                    error: "Submission has no execution"
                });
            }

            // Check if execution is already completed or failed
            if (submission.executionStatus === "completed") {
                // Return final output directly
                return reply.send({
                    success: true,
                    data: {
                        status: "completed",
                        output: submission.output
                    }
                });
            }

            if (submission.executionStatus === "failed") {
                return reply.send({
                    success: true,
                    data: {
                        status: "failed",
                        error: "Execution failed"
                    }
                });
            }

            // Set up SSE streaming
            reply.raw.setHeader("Content-Type", "text/event-stream");
            reply.raw.setHeader("Cache-Control", "no-cache");
            reply.raw.setHeader("Connection", "keep-alive");
            reply.raw.setHeader("Access-Control-Allow-Origin", "*");

            const executionId = submission.executionId;
            const isWorkflow = formInterface.targetType === "workflow";

            // Subscription channel for cleanup
            let subscriptionChannel: string | null = null;

            const sendEvent = (event: string, data: unknown) => {
                reply.raw.write(`event: ${event}\n`);
                reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
            };

            // Keep-alive ping
            const pingInterval = setInterval(() => {
                sendEvent("ping", { timestamp: Date.now() });
            }, 15000);

            const cleanup = async () => {
                clearInterval(pingInterval);
                if (subscriptionChannel) {
                    await redisEventBus.unsubscribe(subscriptionChannel);
                }
            };

            // Handle client disconnect
            request.raw.on("close", () => {
                cleanup();
            });

            // Subscribe to execution events based on target type
            if (isWorkflow) {
                // For workflows, subscribe to execution events
                subscriptionChannel = `execution:${executionId}:*`;
                await redisEventBus.subscribe(subscriptionChannel, async (wsEvent) => {
                    const event = wsEvent as unknown as {
                        type: string;
                        status?: string;
                        output?: string;
                        error?: string;
                    };

                    sendEvent(event.type, event);

                    // Update submission on completion
                    if (event.type === "execution:completed" || event.type === "execution:failed") {
                        const status = event.status === "completed" ? "completed" : "failed";
                        await submissionRepo.updateExecutionStatus(
                            submissionId,
                            status,
                            undefined,
                            event.output
                        );

                        // Close the stream
                        await cleanup();
                        reply.raw.end();
                    }
                });
            } else {
                // For agents, subscribe to agent events
                subscriptionChannel = "agent:events:*";
                await redisEventBus.subscribe(subscriptionChannel, async (wsEvent) => {
                    const event = wsEvent as unknown as {
                        type: string;
                        executionId?: string;
                        status?: string;
                        token?: string;
                        finalMessage?: string;
                        error?: string;
                    };

                    // Filter by execution ID
                    if (event.executionId !== executionId) {
                        return;
                    }

                    sendEvent(event.type, event);

                    // Update submission on completion
                    if (event.type === "agent:execution:completed") {
                        await submissionRepo.updateExecutionStatus(
                            submissionId,
                            "completed",
                            undefined,
                            event.finalMessage
                        );

                        await cleanup();
                        reply.raw.end();
                    } else if (event.type === "agent:execution:failed") {
                        await submissionRepo.updateExecutionStatus(
                            submissionId,
                            "failed",
                            undefined,
                            event.error
                        );

                        await cleanup();
                        reply.raw.end();
                    }
                });
            }

            // Send initial connected event
            sendEvent("connected", {
                executionId,
                submissionId,
                targetType: formInterface.targetType
            });

            // Check current execution status
            if (isWorkflow) {
                const executionRepo = new ExecutionRepository();
                const execution = await executionRepo.findById(executionId);
                if (execution?.status === "completed" || execution?.status === "failed") {
                    sendEvent("execution:status", {
                        type: `execution:${execution.status}`,
                        status: execution.status,
                        output: execution.outputs
                    });

                    await submissionRepo.updateExecutionStatus(
                        submissionId,
                        execution.status,
                        undefined,
                        typeof execution.outputs === "string"
                            ? execution.outputs
                            : JSON.stringify(execution.outputs)
                    );

                    await cleanup();
                    reply.raw.end();
                }
            } else {
                const agentExecutionRepo = new AgentExecutionRepository();
                const execution = await agentExecutionRepo.findById(executionId);
                if (execution?.status === "completed" || execution?.status === "failed") {
                    const lastMessage =
                        execution.thread_history?.[execution.thread_history.length - 1];
                    const output = lastMessage?.content || "";

                    sendEvent("agent:execution:status", {
                        type: `agent:execution:${execution.status}`,
                        status: execution.status,
                        finalMessage: output
                    });

                    await submissionRepo.updateExecutionStatus(
                        submissionId,
                        execution.status,
                        undefined,
                        output
                    );

                    await cleanup();
                    reply.raw.end();
                }
            }
        } catch (error) {
            logger.error({ slug, submissionId, error }, "Error streaming form interface execution");
            return reply.status(500).send({
                success: false,
                error: "Failed to stream execution"
            });
        }
    });

    /**
     * GET /api/public/form-interfaces/:slug/submissions/:submissionId/status
     * Get current status of a form interface submission (polling alternative to SSE)
     * No auth required (public endpoint)
     */
    fastify.get("/:slug/submissions/:submissionId/status", async (request, reply) => {
        const { slug, submissionId } = request.params as {
            slug: string;
            submissionId: string;
        };

        try {
            // Find the form interface
            const formInterface = await formInterfaceRepo.findBySlug(slug);

            if (!formInterface) {
                return reply.status(404).send({
                    success: false,
                    error: "Form interface not found"
                });
            }

            // Find the submission
            const submission = await submissionRepo.findById(submissionId);

            if (!submission) {
                return reply.status(404).send({
                    success: false,
                    error: "Submission not found"
                });
            }

            // Validate submission belongs to this form interface
            if (submission.interfaceId !== formInterface.id) {
                return reply.status(403).send({
                    success: false,
                    error: "Submission does not belong to this form interface"
                });
            }

            return reply.send({
                success: true,
                data: {
                    submissionId: submission.id,
                    executionId: submission.executionId,
                    executionStatus: submission.executionStatus,
                    attachmentsStatus: submission.attachmentsStatus,
                    output: submission.output
                }
            });
        } catch (error) {
            logger.error(
                { slug, submissionId, error },
                "Error getting form interface submission status"
            );
            return reply.status(500).send({
                success: false,
                error: "Failed to get submission status"
            });
        }
    });
}
