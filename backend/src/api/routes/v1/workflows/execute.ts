import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import {
    convertFrontendToBackend,
    stripNonExecutableNodes
} from "../../../../core/utils/workflow-converter";
import { ExecutionRepository } from "../../../../storage/repositories/ExecutionRepository";
import { WorkflowRepository } from "../../../../storage/repositories/WorkflowRepository";
import { getTemporalClient } from "../../../../temporal/client";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendSuccess, sendNotFound, sendValidationError, sendError } from "../response-helpers";

const logger = createServiceLogger("PublicApiWorkflowExecute");

interface ExecuteWorkflowParams {
    id: string;
}

interface ExecuteWorkflowBody {
    inputs?: Record<string, unknown>;
}

/**
 * POST /api/v1/workflows/:id/execute
 *
 * Execute a workflow by ID.
 *
 * Required scopes: workflows:read, workflows:execute
 *
 * Returns immediately with an execution ID. Use the executions endpoint
 * to poll for status or stream events.
 */
export async function executeWorkflowHandler(fastify: FastifyInstance): Promise<void> {
    fastify.post<{ Params: ExecuteWorkflowParams; Body: ExecuteWorkflowBody }>(
        "/:id/execute",
        {
            preHandler: [requireScopes("workflows:read", "workflows:execute")]
        },
        async (
            request: FastifyRequest<{ Params: ExecuteWorkflowParams; Body: ExecuteWorkflowBody }>,
            reply: FastifyReply
        ) => {
            const userId = request.apiKeyUserId!;
            const workflowId = request.params.id;
            const body = request.body || {};

            try {
                const workflowRepo = new WorkflowRepository();
                const executionRepo = new ExecutionRepository();

                // Get the workflow
                const workflow = await workflowRepo.findById(workflowId);

                // Check if workflow exists and belongs to the user
                if (!workflow || workflow.user_id !== userId) {
                    return sendNotFound(reply, "Workflow", workflowId);
                }

                // Validate workflow has a definition
                if (!workflow.definition) {
                    return sendValidationError(reply, "Workflow has no definition");
                }

                // Prepare inputs (use provided inputs or empty object)
                const inputs = body.inputs || {};

                // Create execution record
                const execution = await executionRepo.create({
                    workflow_id: workflow.id,
                    inputs: inputs as Record<string, JsonValue>
                });

                // Convert workflow definition if needed
                let backendWorkflowDef: WorkflowDefinition;
                const workflowDef = workflow.definition as {
                    nodes?: unknown;
                    edges?: unknown;
                };

                // Check if already in backend format (nodes is an object/Record)
                if (workflowDef.nodes && !Array.isArray(workflowDef.nodes)) {
                    // Already in backend format
                    backendWorkflowDef = {
                        ...(workflowDef as WorkflowDefinition),
                        name: workflow.name
                    };
                } else if (workflowDef.nodes && Array.isArray(workflowDef.nodes)) {
                    // Frontend format, needs conversion
                    backendWorkflowDef = convertFrontendToBackend(
                        workflow.definition as unknown as {
                            nodes: Array<{
                                id: string;
                                type: string;
                                data: Record<string, unknown>;
                                position?: { x: number; y: number };
                            }>;
                            edges: Array<{
                                id: string;
                                source: string;
                                target: string;
                                sourceHandle?: string;
                            }>;
                        },
                        workflow.name
                    );
                } else {
                    return sendValidationError(reply, "Invalid workflow definition format");
                }

                // Strip non-executable nodes (comments, etc.)
                backendWorkflowDef = stripNonExecutableNodes(backendWorkflowDef, workflow.name);

                // Start Temporal workflow
                const client = await getTemporalClient();
                const temporalWorkflowId = `execution-${execution.id}`;

                await client.workflow.start("orchestratorWorkflow", {
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId: temporalWorkflowId,
                    args: [
                        {
                            executionId: execution.id,
                            workflowDefinition: backendWorkflowDef,
                            inputs,
                            userId,
                            source: "public_api"
                        }
                    ]
                });

                logger.info(
                    { executionId: execution.id, workflowId: workflow.id, userId },
                    "Started workflow execution via public API"
                );

                // Return immediately with execution details
                return sendSuccess(
                    reply,
                    {
                        execution_id: execution.id,
                        workflow_id: workflow.id,
                        status: "pending",
                        inputs
                    },
                    202 // Accepted
                );
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Workflow execution failed";
                logger.error({ error, workflowId, userId }, "Workflow execution failed");
                return sendError(reply, 500, "execution_failed", errorMsg);
            }
        }
    );
}
