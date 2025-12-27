import { FastifyInstance } from "fastify";
import { z } from "zod";
import { wait } from "@trigger.dev/sdk/v3";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import {
    authMiddleware,
    validateParams,
    validateBody,
    NotFoundError,
    BadRequestError
} from "../../middleware";
import { executionIdParamSchema } from "../../schemas/execution-schemas";

const submitInputBodySchema = z.object({
    userResponse: z.string().min(1, "User response cannot be empty"),
    nodeId: z.string().optional(),
    waitpointId: z.string().optional()
});

interface SubmitInputParams {
    id: string;
}

interface SubmitInputBody {
    userResponse: string;
    nodeId?: string;
    waitpointId?: string;
}

export async function submitInputRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: SubmitInputParams; Body: SubmitInputBody }>(
        "/:id/submit-input",
        {
            preHandler: [
                authMiddleware,
                validateParams(executionIdParamSchema),
                validateBody(submitInputBodySchema)
            ]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params;
            const { userResponse, nodeId, waitpointId } = request.body;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            // Check if execution is paused or running
            if (execution.status !== "running" && execution.status !== "paused") {
                throw new BadRequestError(
                    `Cannot submit input for execution with status: ${execution.status}`
                );
            }

            try {
                // Complete the waitpoint with the user's response
                // The waitpointId should be provided by the frontend from the execution metadata
                const tokenId = waitpointId || `user-input-${id}-${nodeId || "default"}`;

                await wait.completeToken(tokenId, { userResponse });

                fastify.log.info(
                    {
                        executionId: id,
                        nodeId,
                        waitpointId: tokenId,
                        responseLength: userResponse.length
                    },
                    "User input submitted to workflow"
                );

                return reply.send({
                    success: true,
                    message: "User input submitted successfully"
                });
            } catch (error) {
                fastify.log.error(
                    {
                        error,
                        executionId: id,
                        nodeId
                    },
                    "Failed to submit user input to workflow"
                );

                const msg =
                    error instanceof Error
                        ? error.message
                        : "Failed to submit user input to workflow";
                throw new BadRequestError(msg);
            }
        }
    );
}
