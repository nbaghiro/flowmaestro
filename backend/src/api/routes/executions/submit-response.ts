import { FastifyInstance } from "fastify";
import { z } from "zod";
import { JsonValue } from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { ExecutionRepository, WorkflowRepository } from "../../../storage/repositories";
import { getTemporalClient } from "../../../temporal/client";
import {
    authMiddleware,
    validateParams,
    validateBody,
    NotFoundError,
    BadRequestError
} from "../../middleware";
import { executionIdParamSchema } from "../../schemas/execution-schemas";

interface SubmitResponseParams {
    id: string;
}

const submitResponseBodySchema = z.object({
    response: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown())])
});

interface SubmitResponseBody {
    response: JsonValue;
}

export async function submitResponseRoute(fastify: FastifyInstance) {
    fastify.post<{ Params: SubmitResponseParams; Body: SubmitResponseBody }>(
        "/:id/submit-response",
        {
            preHandler: [
                authMiddleware,
                validateParams(executionIdParamSchema),
                validateBody(submitResponseBodySchema)
            ]
        },
        async (request, reply) => {
            const executionRepository = new ExecutionRepository();
            const workflowRepository = new WorkflowRepository();
            const { id } = request.params;
            const { response } = request.body;

            const execution = await executionRepository.findById(id);

            if (!execution) {
                throw new NotFoundError("Execution not found");
            }

            // Check if user owns the workflow
            const workflow = await workflowRepository.findById(execution.workflow_id);
            if (!workflow || workflow.user_id !== request.user!.id) {
                throw new NotFoundError("Execution not found");
            }

            // Check if execution is paused
            if (execution.status !== "paused") {
                throw new BadRequestError(
                    `Cannot submit response to execution with status: ${execution.status}. Execution must be paused.`
                );
            }

            // Check if pause context exists
            if (!execution.pause_context) {
                throw new BadRequestError(
                    "Execution is paused but has no pause context. Cannot submit response."
                );
            }

            const pauseContext = execution.pause_context;

            // Validate response type matches expected input type
            const inputType = pauseContext.inputType || "text";
            let validatedResponse: JsonValue = response;

            switch (inputType) {
                case "number":
                    if (typeof response !== "number") {
                        const parsed = Number(response);
                        if (isNaN(parsed)) {
                            throw new BadRequestError("Response must be a valid number");
                        }
                        validatedResponse = parsed;
                    }
                    break;
                case "boolean":
                    if (typeof response !== "boolean") {
                        if (response === "true" || response === "1") {
                            validatedResponse = true;
                        } else if (response === "false" || response === "0") {
                            validatedResponse = false;
                        } else {
                            throw new BadRequestError("Response must be a boolean (true/false)");
                        }
                    }
                    break;
                case "json":
                    if (typeof response === "string") {
                        try {
                            validatedResponse = JSON.parse(response);
                        } catch {
                            throw new BadRequestError("Response must be valid JSON");
                        }
                    }
                    break;
                case "text":
                default:
                    if (typeof response !== "string") {
                        validatedResponse = String(response);
                    }
                    break;
            }

            // Check required field
            if (
                pauseContext.required &&
                (validatedResponse === null ||
                    validatedResponse === undefined ||
                    validatedResponse === "")
            ) {
                throw new BadRequestError("Response is required");
            }

            try {
                // Store the response in the execution's current state
                const currentState = (execution.current_state as Record<string, JsonValue>) || {};
                const variableName = pauseContext.variableName || "userResponse";

                const updatedState = {
                    ...currentState,
                    [variableName]: validatedResponse,
                    _userResponseSubmittedAt: Date.now(),
                    _userResponseNodeId: pauseContext.nodeId
                };

                // Update execution status to running and clear pause context
                await executionRepository.update(id, {
                    status: "running",
                    current_state: updatedState,
                    pause_context: null
                });

                // Emit event for real-time updates
                await redisEventBus.publish("workflow:events:execution:resumed", {
                    type: "execution:resumed",
                    timestamp: Date.now(),
                    executionId: id,
                    status: "running",
                    variableName,
                    response: validatedResponse
                });

                // Signal the Temporal workflow to resume with the human review response
                try {
                    const client = await getTemporalClient();
                    const handle = client.workflow.getHandle(id);
                    await handle.signal("humanReviewResponse", {
                        variableName,
                        response: validatedResponse,
                        submittedAt: Date.now()
                    });
                } catch (signalError) {
                    // Workflow may have already completed or not support signals
                    // This is OK - the response is stored in the database
                    fastify.log.warn(
                        { error: signalError, executionId: id },
                        "Could not signal workflow to resume - workflow may have completed"
                    );
                }

                const updatedExecution = await executionRepository.findById(id);

                return reply.send({
                    success: true,
                    data: updatedExecution,
                    message: "User response submitted successfully"
                });
            } catch (error) {
                if (error instanceof BadRequestError || error instanceof NotFoundError) {
                    throw error;
                }
                fastify.log.error({ error, executionId: id }, "Failed to submit user response");
                throw new BadRequestError("Failed to submit user response");
            }
        }
    );
}
