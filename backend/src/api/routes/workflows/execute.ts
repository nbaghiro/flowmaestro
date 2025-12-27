import { FastifyInstance } from "fastify";
import type { JsonObject } from "@flowmaestro/shared";
import {
    convertFrontendToBackend,
    FrontendWorkflowDefinition
} from "../../../core/utils/workflow-converter";
import { workflowExecutor, WorkflowExecutionPayload } from "../../../trigger/tasks";
import { authMiddleware } from "../../middleware";

interface ExecuteWorkflowBody {
    workflowDefinition: FrontendWorkflowDefinition;
    inputs?: Record<string, unknown>;
}

export async function executeWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/execute",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const body = request.body as ExecuteWorkflowBody;

            if (!body.workflowDefinition || !body.workflowDefinition.nodes) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid workflow definition"
                });
            }

            try {
                // Generate unique execution ID
                const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                // Convert frontend workflow definition to backend format
                const definition = convertFrontendToBackend(
                    body.workflowDefinition,
                    `Workflow ${workflowId}`
                );

                // Get user ID from authenticated request
                const userId = (request as unknown as { user: { id: string } }).user?.id || "anonymous";

                // Build payload for Trigger.dev task
                const payload: WorkflowExecutionPayload = {
                    executionId,
                    workflowId,
                    userId,
                    definition,
                    inputs: (body.inputs || {}) as JsonObject,
                    triggerType: "manual"
                };

                // Trigger the workflow execution and wait for result
                const run = await workflowExecutor.triggerAndWait(payload);

                fastify.log.info(`Completed workflow ${workflowId}`);

                return reply.send({
                    success: true,
                    data: {
                        workflowId,
                        executionId,
                        result: run
                    }
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Workflow execution failed";
                fastify.log.error(`Workflow execution failed: ${errorMsg}`);
                return reply.status(500).send({
                    success: false,
                    error: errorMsg
                });
            }
        }
    );
}
