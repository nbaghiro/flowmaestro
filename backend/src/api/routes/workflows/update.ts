import { FastifyInstance } from "fastify";
import { WorkflowDefinition } from "@flowmaestro/shared";
import { WorkflowRepository, UserRepository } from "../../../storage/repositories";
import {
    authMiddleware,
    workspaceContextMiddleware,
    validateRequest,
    validateParams,
    NotFoundError,
    ForbiddenError
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
            const userRepository = new UserRepository();
            const { id } = request.params as { id: string };
            const body = request.body as {
                name?: string;
                description?: string;
                definition?: unknown;
                aiGenerated?: boolean;
                aiPrompt?: string;
            };

            // Check if workflow exists
            const existingWorkflow = await workflowRepository.findById(id);
            if (!existingWorkflow) {
                throw new NotFoundError("Workflow not found");
            }

            // For system workflows, require admin access
            if (existingWorkflow.workflow_type === "system") {
                const user = await userRepository.findById(request.user.id);
                if (!user?.is_admin) {
                    throw new ForbiddenError("Admin access required to modify system workflows");
                }
            } else {
                // For regular workflows, check workspace ownership
                if (existingWorkflow.workspace_id !== request.workspace!.id) {
                    throw new NotFoundError("Workflow not found");
                }
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
