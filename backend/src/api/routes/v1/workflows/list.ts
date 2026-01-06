import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WorkflowRepository } from "../../../../storage/repositories";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendPaginated, parsePaginationQuery } from "../response-helpers";

interface ListWorkflowsQuery {
    page?: string;
    per_page?: string;
}

/**
 * GET /api/v1/workflows
 *
 * List all workflows for the authenticated user.
 *
 * Required scope: workflows:read
 */
export async function listWorkflowsHandler(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Querystring: ListWorkflowsQuery }>(
        "/",
        {
            preHandler: [requireScopes("workflows:read")]
        },
        async (
            request: FastifyRequest<{ Querystring: ListWorkflowsQuery }>,
            reply: FastifyReply
        ) => {
            const userId = request.apiKeyUserId!;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            const workflowRepository = new WorkflowRepository();
            const { workflows, total } = await workflowRepository.findByUserId(userId, {
                limit: per_page,
                offset
            });

            // Transform to public API format (exclude internal fields)
            const publicWorkflows = workflows.map((w) => ({
                id: w.id,
                name: w.name,
                description: w.description,
                version: w.version,
                created_at: w.created_at.toISOString(),
                updated_at: w.updated_at.toISOString()
            }));

            return sendPaginated(reply, publicWorkflows, {
                page,
                per_page,
                total_count: total
            });
        }
    );
}
