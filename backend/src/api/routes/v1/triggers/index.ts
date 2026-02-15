import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import { convertFrontendToBackend, stripNonExecutableNodes } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import { ExecutionRepository } from "../../../../storage/repositories/ExecutionRepository";
import { TriggerRepository } from "../../../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../../../storage/repositories/WorkflowRepository";
import { getTemporalClient } from "../../../../temporal/client";
import { requireScopes } from "../../../middleware/scope-checker";
import {
    sendSuccess,
    sendPaginated,
    sendNotFound,
    sendError,
    parsePaginationQuery
} from "../response-helpers";
import type { WorkflowTrigger } from "../../../../storage/models/Trigger";

const logger = createServiceLogger("PublicApiTriggers");

/**
 * Public API v1 - Triggers routes.
 */
export async function triggersV1Routes(fastify: FastifyInstance): Promise<void> {
    // GET /api/v1/triggers - List triggers
    fastify.get(
        "/",
        {
            preHandler: [requireScopes("triggers:read")]
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            const workflowRepo = new WorkflowRepository();
            const triggerRepo = new TriggerRepository();

            // First get workspace's workflows
            const { workflows } = await workflowRepo.findByWorkspaceId(workspaceId, {
                limit: 1000
            });

            // Get triggers for all user's workflows
            const allTriggers: WorkflowTrigger[] = [];
            for (const workflow of workflows) {
                const workflowTriggers = await triggerRepo.findByWorkflowId(workflow.id);
                allTriggers.push(...workflowTriggers);
            }

            // Sort by created_at descending and apply pagination
            allTriggers.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            const paginatedTriggers = allTriggers.slice(offset, offset + per_page);
            const total = allTriggers.length;

            const publicTriggers = paginatedTriggers.map((t) => ({
                id: t.id,
                workflow_id: t.workflow_id,
                name: t.name,
                trigger_type: t.trigger_type,
                enabled: t.enabled,
                last_triggered_at: t.last_triggered_at?.toISOString() || null,
                trigger_count: t.trigger_count,
                created_at: t.created_at.toISOString(),
                updated_at: t.updated_at.toISOString()
            }));

            return sendPaginated(reply, publicTriggers, {
                page,
                per_page,
                total_count: total
            });
        }
    );

    // POST /api/v1/triggers/:id/execute - Execute trigger
    fastify.post<{ Params: { id: string }; Body: { inputs?: Record<string, unknown> } }>(
        "/:id/execute",
        {
            preHandler: [requireScopes("triggers:read", "triggers:execute")]
        },
        async (
            request: FastifyRequest<{
                Params: { id: string };
                Body: { inputs?: Record<string, unknown> };
            }>,
            reply: FastifyReply
        ) => {
            const userId = request.apiKeyUserId!;
            const workspaceId = request.apiKeyWorkspaceId!;
            const triggerId = request.params.id;
            const body = request.body || {};

            try {
                const triggerRepo = new TriggerRepository();
                const workflowRepo = new WorkflowRepository();
                const executionRepo = new ExecutionRepository();

                const trigger = await triggerRepo.findById(triggerId);
                if (!trigger) {
                    return sendNotFound(reply, "Trigger", triggerId);
                }

                // Verify workspace access via workflow
                const workflow = await workflowRepo.findByIdAndWorkspaceId(
                    trigger.workflow_id,
                    workspaceId
                );
                if (!workflow) {
                    return sendNotFound(reply, "Trigger", triggerId);
                }

                if (!trigger.enabled) {
                    return sendError(reply, 400, "validation_error", "Trigger is not enabled");
                }

                const inputs = body.inputs || {};

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

                // Convert workflow definition
                let backendWorkflowDef: WorkflowDefinition;
                const workflowDef = workflow.definition as { nodes?: unknown; edges?: unknown };

                if (workflowDef.nodes && !Array.isArray(workflowDef.nodes)) {
                    backendWorkflowDef = {
                        ...(workflowDef as WorkflowDefinition),
                        name: workflow.name
                    };
                } else if (workflowDef.nodes && Array.isArray(workflowDef.nodes)) {
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
                    return sendError(reply, 400, "validation_error", "Invalid workflow definition");
                }

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
                            source: "public_api_trigger"
                        }
                    ]
                });

                logger.info(
                    { executionId: execution.id, triggerId, userId },
                    "Trigger executed via public API"
                );

                return sendSuccess(
                    reply,
                    {
                        execution_id: execution.id,
                        workflow_id: workflow.id,
                        trigger_id: trigger.id,
                        status: "pending",
                        inputs
                    },
                    202
                );
            } catch (error: unknown) {
                const errorMsg =
                    error instanceof Error ? error.message : "Trigger execution failed";
                logger.error({ error, triggerId, userId }, "Trigger execution failed");
                return sendError(reply, 500, "execution_failed", errorMsg);
            }
        }
    );
}
