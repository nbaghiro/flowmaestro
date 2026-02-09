import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ExecutionStatus } from "@flowmaestro/shared";
import { ExecutionRepository } from "../../../../storage/repositories/ExecutionRepository";
import { WorkflowRepository } from "../../../../storage/repositories/WorkflowRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendPaginated, parsePaginationQuery } from "../response-helpers";

interface ListExecutionsQuery {
    page?: string;
    per_page?: string;
    workflow_id?: string;
    status?: string;
}

/**
 * GET /api/v1/executions
 *
 * List executions for the authenticated user.
 *
 * Required scope: executions:read
 */
export async function listExecutionsHandler(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Querystring: ListExecutionsQuery }>(
        "/",
        {
            preHandler: [requireScopes("executions:read")]
        },
        async (
            request: FastifyRequest<{ Querystring: ListExecutionsQuery }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );
            const { workflow_id, status } = request.query;

            const executionRepo = new ExecutionRepository();
            const workflowRepo = new WorkflowRepository();

            // If a specific workflow_id is provided, verify ownership and fetch its executions
            if (workflow_id) {
                const workflow = await workflowRepo.findByIdAndWorkspaceId(
                    workflow_id,
                    workspaceId
                );
                if (!workflow) {
                    return sendPaginated(reply, [], {
                        page,
                        per_page,
                        total_count: 0
                    });
                }

                const { executions, total } = await executionRepo.findByWorkflowId(workflow_id, {
                    limit: per_page,
                    offset
                });

                // Filter by status if provided
                let filteredExecutions = executions;
                let filteredTotal = total;
                if (status) {
                    filteredExecutions = executions.filter((e) => e.status === status);
                    filteredTotal = filteredExecutions.length;
                }

                const publicExecutions = filteredExecutions.map((e) => ({
                    id: e.id,
                    workflow_id: e.workflow_id,
                    status: e.status,
                    inputs: e.inputs,
                    outputs: e.outputs,
                    error: e.error,
                    started_at: e.started_at?.toISOString() || null,
                    completed_at: e.completed_at?.toISOString() || null,
                    created_at: e.created_at.toISOString()
                }));

                return sendPaginated(reply, publicExecutions, {
                    page,
                    per_page,
                    total_count: filteredTotal
                });
            }

            // Get all workspace's workflows first
            const { workflows } = await workflowRepo.findByWorkspaceId(workspaceId, {
                limit: 1000
            });
            const workflowIds = new Set(workflows.map((w) => w.id));

            // Get all executions filtered by status if provided
            const { executions } = await executionRepo.findAll({
                limit: per_page + offset, // Fetch extra to allow for filtering
                offset: 0,
                status: status as ExecutionStatus | undefined
            });

            // Filter to only user's workflows
            const userExecutions = executions.filter((e) => workflowIds.has(e.workflow_id));

            // Apply pagination after filtering
            const paginatedExecutions = userExecutions.slice(offset, offset + per_page);
            const totalCount = userExecutions.length;

            const publicExecutions = paginatedExecutions.map((e) => ({
                id: e.id,
                workflow_id: e.workflow_id,
                status: e.status,
                inputs: e.inputs,
                outputs: e.outputs,
                error: e.error,
                started_at: e.started_at?.toISOString() || null,
                completed_at: e.completed_at?.toISOString() || null,
                created_at: e.created_at.toISOString()
            }));

            return sendPaginated(reply, publicExecutions, {
                page,
                per_page,
                total_count: totalCount
            });
        }
    );
}
