import { FastifyInstance } from "fastify";
import { WorkflowDefinition } from "@flowmaestro/shared";
import { WorkflowRepository } from "../../../storage/repositories";
import {
    authMiddleware,
    workspaceContextMiddleware,
    validateRequest,
    validateParams,
    NotFoundError
} from "../../middleware";
import { updateWorkflowSchema, workflowIdParamSchema } from "../../schemas/workflow-schemas";

export async function updateWorkflowRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateParams(workflowIdParamSchema),
                validateRequest(updateWorkflowSchema)
            ]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as { id: string };
            const body = request.body as {
                name?: string;
                description?: string;
                definition?: unknown;
                aiGenerated?: boolean;
                aiPrompt?: string;
            };

            // Check if workflow exists and belongs to this workspace
            const existingWorkflow = await workflowRepository.findById(id);
            if (!existingWorkflow) {
                throw new NotFoundError("Workflow not found");
            }

            if (existingWorkflow.workspace_id !== request.workspace!.id) {
                throw new NotFoundError("Workflow not found");
            }

            // Update workflow
            const workflow = await workflowRepository.update(id, {
                name: body.name,
                description: body.description,
                definition: body.definition as unknown as WorkflowDefinition | undefined,
                ai_generated: body.aiGenerated,
                ai_prompt: body.aiPrompt
            });

            return reply.send({
                success: true,
                data: workflow
            });
        }
    );
}
