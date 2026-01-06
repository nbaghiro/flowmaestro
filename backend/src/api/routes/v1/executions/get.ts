import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ExecutionRepository } from "../../../../storage/repositories/ExecutionRepository";
import { WorkflowRepository } from "../../../../storage/repositories/WorkflowRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendSuccess, sendNotFound } from "../response-helpers";

interface GetExecutionParams {
    id: string;
}

/**
 * GET /api/v1/executions/:id
 *
 * Get execution details by ID.
 *
 * Required scope: executions:read
 */
export async function getExecutionHandler(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Params: GetExecutionParams }>(
        "/:id",
        {
            preHandler: [requireScopes("executions:read")]
        },
        async (request: FastifyRequest<{ Params: GetExecutionParams }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const executionId = request.params.id;

            const executionRepo = new ExecutionRepository();
            const workflowRepo = new WorkflowRepository();

            const execution = await executionRepo.findById(executionId);
            if (!execution) {
                return sendNotFound(reply, "Execution", executionId);
            }

            // Verify the execution belongs to the user via workflow ownership
            const workflow = await workflowRepo.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== userId) {
                return sendNotFound(reply, "Execution", executionId);
            }

            // Transform to public API format
            const publicExecution = {
                id: execution.id,
                workflow_id: execution.workflow_id,
                status: execution.status,
                inputs: execution.inputs,
                outputs: execution.outputs,
                error: execution.error,
                started_at: execution.started_at?.toISOString() || null,
                completed_at: execution.completed_at?.toISOString() || null,
                created_at: execution.created_at.toISOString()
            };

            return sendSuccess(reply, publicExecution);
        }
    );
}
