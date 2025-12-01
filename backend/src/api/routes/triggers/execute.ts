import { FastifyInstance } from "fastify";
import type { JsonValue } from "@flowmaestro/shared";
import { WorkflowDefinition } from "@flowmaestro/shared";
import {
    convertFrontendToBackend,
    stripNonExecutableNodes
} from "../../../core/utils/workflow-converter";
import { ManualTriggerConfig } from "../../../storage/models/Trigger";
import { ExecutionRepository } from "../../../storage/repositories/ExecutionRepository";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";
import { getTemporalClient } from "../../../temporal/client";
import { authMiddleware } from "../../middleware";

interface ExecuteTriggerBody {
    inputs?: Record<string, unknown>; // Optional inputs override
}

export async function executeTriggerRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/execute",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const body = (request.body || {}) as ExecuteTriggerBody;
            const userId = request.user.id;

            try {
                const triggerRepo = new TriggerRepository();
                const workflowRepo = new WorkflowRepository();
                const executionRepo = new ExecutionRepository();

                // Get the trigger
                const trigger = await triggerRepo.findById(id);
                if (!trigger) {
                    return reply.status(404).send({
                        success: false,
                        error: "Trigger not found"
                    });
                }

                // Check if trigger is enabled
                if (!trigger.enabled) {
                    return reply.status(400).send({
                        success: false,
                        error: "Trigger is not enabled"
                    });
                }

                // Get the workflow
                const workflow = await workflowRepo.findById(trigger.workflow_id);
                if (!workflow) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workflow not found"
                    });
                }

                // Determine inputs based on trigger type
                let inputs: Record<string, unknown> = {};

                if (trigger.trigger_type === "manual") {
                    const config = trigger.config as ManualTriggerConfig;
                    // Use provided inputs override, or fallback to trigger config inputs
                    inputs = body.inputs || config.inputs || {};
                } else if (trigger.trigger_type === "webhook") {
                    // For webhook triggers, use provided inputs
                    inputs = body.inputs || {};
                } else if (trigger.trigger_type === "schedule") {
                    // For schedule triggers, use provided inputs override or empty
                    inputs = body.inputs || {};
                } else {
                    // For other trigger types
                    inputs = body.inputs || {};
                }

                // Create execution record
                const execution = await executionRepo.create({
                    workflow_id: workflow.id,
                    inputs: inputs as Record<string, JsonValue>
                });

                // Create trigger execution link
                await triggerRepo.createExecution({
                    trigger_id: trigger.id,
                    execution_id: execution.id,
                    trigger_payload: inputs as Record<string, JsonValue>
                });

                // Update trigger stats
                await triggerRepo.recordTrigger(trigger.id);

                // Start Temporal workflow
                const client = await getTemporalClient();
                const workflowId = `execution-${execution.id}`;

                // Convert frontend workflow definition to backend format if needed
                let backendWorkflowDef: WorkflowDefinition;
                const workflowDef = workflow.definition as { nodes?: unknown; edges?: unknown };

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
                    throw new Error("Invalid workflow definition format");
                }

                // Strip non-executable nodes
                backendWorkflowDef = stripNonExecutableNodes(backendWorkflowDef, workflow.name);

                // Start the workflow (non-blocking)
                await client.workflow.start("orchestratorWorkflow", {
                    taskQueue: "flowmaestro-orchestrator",
                    workflowId,
                    args: [
                        {
                            executionId: execution.id,
                            workflowDefinition: backendWorkflowDef,
                            inputs,
                            userId
                        }
                    ]
                });

                fastify.log.info(
                    `Started workflow execution ${execution.id} from trigger ${trigger.id}`
                );

                // Return immediately with execution ID
                return reply.send({
                    success: true,
                    data: {
                        executionId: execution.id,
                        workflowId: workflow.id,
                        triggerId: trigger.id,
                        status: execution.status,
                        inputs
                    }
                });
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Trigger execution failed";
                fastify.log.error(`Trigger execution failed: ${errorMsg}`);
                return reply.status(500).send({
                    success: false,
                    error: errorMsg
                });
            }
        }
    );
}
