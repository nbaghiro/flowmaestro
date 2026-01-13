import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import {
    authMiddleware,
    workspaceContextMiddleware,
    validateParams,
    NotFoundError
} from "../../middleware";
import { workflowIdParamSchema } from "../../schemas/workflow-schemas";

export async function getWorkflowRoute(fastify: FastifyInstance) {
    fastify.get(
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

            const workflow = await workflowRepository.findById(id);

            if (!workflow) {
                throw new NotFoundError("Workflow not found");
            }

            // Check if workflow belongs to this workspace
            if (workflow.workspace_id !== request.workspace!.id) {
                throw new NotFoundError("Workflow not found");
            }

            return reply.send({
                success: true,
                data: workflow
            });
        }
    );
}
