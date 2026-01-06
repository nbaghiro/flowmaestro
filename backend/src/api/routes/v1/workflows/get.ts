import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { WorkflowRepository } from "../../../../storage/repositories";
import { requireScopes } from "../../../middleware/scope-checker";
import { sendSuccess, sendNotFound } from "../response-helpers";

interface GetWorkflowParams {
    id: string;
}

/**
 * GET /api/v1/workflows/:id
 *
 * Get a specific workflow by ID.
 *
 * Required scope: workflows:read
 */
export async function getWorkflowHandler(fastify: FastifyInstance): Promise<void> {
    fastify.get<{ Params: GetWorkflowParams }>(
        "/:id",
        {
            preHandler: [requireScopes("workflows:read")]
        },
        async (request: FastifyRequest<{ Params: GetWorkflowParams }>, reply: FastifyReply) => {
            const userId = request.apiKeyUserId!;
            const workflowId = request.params.id;

            const workflowRepository = new WorkflowRepository();
            const workflow = await workflowRepository.findById(workflowId);

            // Check if workflow exists and belongs to the user
            if (!workflow || workflow.user_id !== userId) {
                return sendNotFound(reply, "Workflow", workflowId);
            }

            // Transform to public API format
            const publicWorkflow = {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description,
                version: workflow.version,
                // Include input/output schema from definition for SDK usage
                inputs: extractInputSchema(
                    workflow.definition as unknown as Record<string, unknown>
                ),
                created_at: workflow.created_at.toISOString(),
                updated_at: workflow.updated_at.toISOString()
            };

            return sendSuccess(reply, publicWorkflow);
        }
    );
}

/**
 * Extract input schema from workflow definition.
 * Looks for input nodes and their configuration.
 */
function extractInputSchema(definition: Record<string, unknown>): Record<string, unknown> | null {
    const nodes = definition.nodes as
        | Record<string, { type: string; config?: Record<string, unknown> }>
        | undefined;
    if (!nodes) return null;

    const inputNodes: Record<string, unknown> = {};

    for (const [nodeId, node] of Object.entries(nodes)) {
        if (node.type === "input" && node.config) {
            inputNodes[nodeId] = {
                type: node.config.inputType || "text",
                label: node.config.label || nodeId,
                required: node.config.required ?? true,
                description: node.config.description
            };
        }
    }

    return Object.keys(inputNodes).length > 0 ? inputNodes : null;
}
