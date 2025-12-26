import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { generateWorkflow } from "../../../services/WorkflowGenerator";
import { authMiddleware, validateRequest } from "../../middleware";
import { generateWorkflowSchema } from "../../schemas/workflow-schemas";

const logger = createServiceLogger("WorkflowGenerate");

export async function generateWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/generate",
        {
            preHandler: [authMiddleware, validateRequest(generateWorkflowSchema)]
        },
        async (request, reply) => {
            const body = request.body as { prompt: string; connectionId?: string };

            try {
                logger.info({ userId: request.user!.id }, "Received generation request");

                const workflow = await generateWorkflow({
                    userPrompt: body.prompt,
                    connectionId: body.connectionId,
                    userId: request.user!.id
                });

                return reply.status(200).send({
                    success: true,
                    data: workflow
                });
            } catch (error) {
                logger.error({ userId: request.user!.id, error }, "Error generating workflow");

                // Return user-friendly error message
                const message =
                    error instanceof Error ? error.message : "Failed to generate workflow";

                return reply.status(500).send({
                    success: false,
                    error: {
                        message,
                        code: "WORKFLOW_GENERATION_FAILED"
                    }
                });
            }
        }
    );
}
