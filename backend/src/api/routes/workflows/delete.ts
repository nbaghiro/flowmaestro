import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import {
    authMiddleware,
    workspaceContextMiddleware,
    validateParams,
    NotFoundError
} from "../../middleware";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";

export async function deleteWorkflowRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateParams(workflowIdParamSchema)
            ]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params as { id: string };

            // Check if workflow exists and belongs to this workspace
            const existingWorkflow = await workflowRepository.findById(id);
            if (!existingWorkflow) {
                throw new NotFoundError("Workflow not found");
            }

            if (existingWorkflow.workspace_id !== request.workspace!.id) {
                throw new NotFoundError("Workflow not found");
            }

            // Soft delete
            await workflowRepository.delete(id);

            return reply.status(204).send();
        }
    );
}
