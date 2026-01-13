import { FastifyInstance } from "fastify";
import { WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, validateRequest } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import { createWorkflowSchema, CreateWorkflowRequest } from "../../schemas/workflow-schemas";

export async function createWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateRequest(createWorkflowSchema)
            ]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const body = request.body as CreateWorkflowRequest;

            const workflow = await workflowRepository.create({
                name: body.name,
                description: body.description,
                definition: body.definition,
                user_id: request.user!.id,
                workspace_id: request.workspace!.id,
                ai_generated: body.aiGenerated,
                ai_prompt: body.aiPrompt
            });

            return reply.status(201).send({
                success: true,
                data: workflow
            });
        }
    );
}
