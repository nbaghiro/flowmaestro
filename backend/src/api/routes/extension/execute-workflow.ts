import { FastifyInstance } from "fastify";
import type {
    ExtensionExecuteWorkflowResponse,
    PageContext,
    InputMapping,
    JsonValue,
    WorkflowDefinition
} from "@flowmaestro/shared";
import { validateWorkflowForExecution } from "@flowmaestro/shared";
import { WorkflowRepository, ExecutionRepository } from "../../../storage/repositories";
import { getTemporalClient } from "../../../temporal/client";
import { orchestratorWorkflow } from "../../../temporal/workflows/workflow-orchestrator";
import { authMiddleware, workspaceContextMiddleware } from "../../middleware";

interface RequestBody {
    workflowId: string;
    pageContext: PageContext;
    inputMappings: InputMapping[];
}

export async function executeWorkflowRoute(fastify: FastifyInstance) {
    fastify.post<{ Body: RequestBody }>(
        "/execute-workflow",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware]
        },
        async (request, reply) => {
            const { workflowId, pageContext, inputMappings } = request.body;
            const workspaceId = request.workspace?.id;
            const userId = request.user?.id;

            if (!workspaceId || !userId) {
                return reply.status(400).send({
                    success: false,
                    error: "Authentication and workspace context required"
                });
            }

            if (!workflowId) {
                return reply.status(400).send({
                    success: false,
                    error: "workflowId is required"
                });
            }

            if (!pageContext) {
                return reply.status(400).send({
                    success: false,
                    error: "pageContext is required"
                });
            }

            const workflowRepo = new WorkflowRepository();
            const executionRepo = new ExecutionRepository();

            // Get workflow
            const workflow = await workflowRepo.findById(workflowId);

            if (!workflow || workflow.workspace_id !== workspaceId) {
                return reply.status(404).send({
                    success: false,
                    error: "Workflow not found"
                });
            }

            // Pre-execution validation using shared validation engine
            const validation = validateWorkflowForExecution(
                workflow.definition as WorkflowDefinition
            );

            if (!validation.isValid) {
                return reply.status(400).send({
                    success: false,
                    error: `Workflow validation failed: ${validation.errors.join(", ")}`
                });
            }

            // Build inputs from page context based on mappings
            const inputs: Record<string, JsonValue> = {};

            for (const mapping of inputMappings || []) {
                if (mapping.source === "none") continue;

                let value: JsonValue | undefined;
                switch (mapping.source) {
                    case "text":
                        value = pageContext.text;
                        break;
                    case "selection":
                        value = pageContext.selection || pageContext.text;
                        break;
                    case "screenshot":
                        if (pageContext.screenshot) {
                            // Convert to data URL for file input
                            value = `data:image/png;base64,${pageContext.screenshot.data}`;
                        }
                        break;
                    case "url":
                        value = pageContext.url;
                        break;
                    case "title":
                        value = pageContext.title;
                        break;
                    case "metadata":
                        value = pageContext.metadata as JsonValue;
                        break;
                }

                if (value !== undefined) {
                    inputs[mapping.nodeId] = value;
                }
            }

            // Create execution record
            const execution = await executionRepo.create({
                workflow_id: workflowId,
                inputs
            });

            try {
                // Start Temporal workflow
                const temporalClient = await getTemporalClient();

                await temporalClient.workflow.start(orchestratorWorkflow, {
                    taskQueue: "workflow-orchestrator",
                    workflowId: `workflow-${execution.id}`,
                    args: [
                        {
                            executionId: execution.id,
                            workflowDefinition: workflow.definition,
                            inputs,
                            userId,
                            workspaceId
                        }
                    ]
                });

                const response: ExtensionExecuteWorkflowResponse = {
                    executionId: execution.id,
                    status: "pending"
                };

                return reply.send({
                    success: true,
                    data: response
                });
            } catch (error) {
                // Update execution status to failed
                await executionRepo.update(execution.id, {
                    status: "failed",
                    error: error instanceof Error ? error.message : "Failed to start workflow"
                });

                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to start workflow"
                });
            }
        }
    );
}
