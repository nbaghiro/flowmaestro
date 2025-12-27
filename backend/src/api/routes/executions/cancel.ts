import { FastifyInstance } from "fastify";
import { runs } from "@trigger.dev/sdk/v3";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateParams, NotFoundError, BadRequestError } from "../../middleware";
import { executionIdParamSchema } from "../../schemas/execution-schemas";

interface CancelExecutionParams {
    id: string;
}

export async function cancelExecutionRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: CancelExecutionParams }>(
        "/:id/cancel",
        {
            preHandler: [authMiddleware, validateParams(executionIdParamSchema)]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            // Check if execution can be cancelled
            if (execution.status !== "running" && execution.status !== "pending") {
                throw new BadRequestError(
                    `Cannot cancel execution with status: ${execution.status}`
                );
            }

            try {
                // Cancel the Trigger.dev run if we have a run ID
                if (execution.run_id) {
                    await runs.cancel(execution.run_id);
                }

                // Update execution status
                await executionRepository.update(id, {
                    status: "cancelled",
                    completed_at: new Date()
                });

                const updatedExecution = await executionRepository.findById(id);

                return reply.send({
                    success: true,
                    data: updatedExecution,
                    message: "Execution cancelled successfully"
                });
            } catch (error) {
                fastify.log.error({ error, executionId: id }, "Failed to cancel execution");
                throw new BadRequestError("Failed to cancel execution");
            }
        }
    );
}
