import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../../core/logging";
import { ExecutionRepository } from "../../../../storage/repositories/ExecutionRepository";
import { WorkflowRepository } from "../../../../storage/repositories/WorkflowRepository";
import { getTemporalClient } from "../../../../temporal/client";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendSuccess, sendNotFound, sendError } from "../response-helpers";

const logger = createServiceLogger("PublicApiExecutionCancel");

interface CancelExecutionParams {
    id: string;
}

/**
 * POST /api/v1/executions/:id/cancel
 *
 * Cancel a running execution.
 *
 * Required scopes: executions:read, executions:cancel
 */
export async function cancelExecutionHandler(fastify: FastifyInstance): Promise<void> {
    fastify.post<{ Params: CancelExecutionParams }>(
        "/:id/cancel",
        {
            preHandler: [requireScopes("executions:read", "executions:cancel")]
        },
        async (request: FastifyRequest<{ Params: CancelExecutionParams }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const executionId = request.params.id;

            try {
                const executionRepo = new ExecutionRepository();
                const workflowRepo = new WorkflowRepository();

                const execution = await executionRepo.findById(executionId);
                if (!execution) {
                    return sendNotFound(reply, "Execution", executionId);
                }

                // Verify ownership via workflow
                const workflow = await workflowRepo.findById(execution.workflow_id);
                if (!workflow || workflow.user_id !== userId) {
                    return sendNotFound(reply, "Execution", executionId);
                }

                // Check if execution can be cancelled
                if (execution.status !== "pending" && execution.status !== "running") {
                    return sendError(
                        reply,
                        400,
                        "validation_error",
                        `Execution cannot be cancelled. Current status: ${execution.status}`
                    );
                }

                // Cancel the Temporal workflow
                const client = await getTemporalClient();
                const temporalWorkflowId = `execution-${executionId}`;

                try {
                    const handle = client.workflow.getHandle(temporalWorkflowId);
                    await handle.cancel();
                } catch (temporalError) {
                    // Workflow may already be completed or not exist
                    logger.warn(
                        { error: temporalError, executionId },
                        "Failed to cancel Temporal workflow (may already be completed)"
                    );
                }

                // Update execution status
                await executionRepo.update(executionId, { status: "cancelled" });

                logger.info({ executionId, userId }, "Execution cancelled via public API");

                return sendSuccess(reply, {
                    id: executionId,
                    status: "cancelled",
                    message: "Execution cancelled successfully"
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Failed to cancel execution";
                logger.error({ error, executionId, userId }, "Failed to cancel execution");
                return sendError(reply, 500, "internal_error", errorMsg);
            }
        }
    );
}
