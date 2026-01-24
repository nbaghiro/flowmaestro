import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../temporal/client";
import { BadRequestError, NotFoundError } from "../../middleware";

const logger = createServiceLogger("PersonaInstances");

const continueInstanceParamsSchema = z.object({
    id: z.string().uuid()
});

const continueInstanceBodySchema = z.object({
    additional_instructions: z.string().min(1).max(10000),
    max_duration_hours: z.number().positive().max(24).optional(),
    max_cost_credits: z.number().positive().max(10000).optional()
});

type ContinueInstanceParams = z.infer<typeof continueInstanceParamsSchema>;
type ContinueInstanceBody = z.infer<typeof continueInstanceBodySchema>;

/**
 * POST /api/persona-instances/:id/continue
 * Continue work on a completed persona instance with additional instructions
 */
export async function continuePersonaInstanceHandler(
    request: FastifyRequest<{
        Params: ContinueInstanceParams;
        Body: ContinueInstanceBody;
    }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;

    // Validate params
    const paramsResult = continueInstanceParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new BadRequestError(paramsResult.error.errors.map((e) => e.message).join(", "));
    }

    // Validate body
    const bodyResult = continueInstanceBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
        throw new BadRequestError(bodyResult.error.errors.map((e) => e.message).join(", "));
    }

    const { id } = paramsResult.data;
    const { additional_instructions, max_duration_hours, max_cost_credits } = bodyResult.data;

    // Get the original instance
    const instanceRepo = new PersonaInstanceRepository();
    const originalInstance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!originalInstance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Verify the instance is in a completed state
    if (!["completed", "cancelled", "failed", "timeout"].includes(originalInstance.status)) {
        throw new BadRequestError(
            `Cannot continue an instance with status "${originalInstance.status}". Only completed, cancelled, failed, or timeout instances can be continued.`
        );
    }

    // Get the persona definition
    const personaRepo = new PersonaDefinitionRepository();
    const persona = await personaRepo.findById(originalInstance.persona_definition_id);

    if (!persona) {
        throw new NotFoundError("Persona definition not found");
    }

    // Determine the root parent ID (for tracking the chain of continuations)
    const rootParentId = originalInstance.parent_instance_id || originalInstance.id;

    // Calculate continuation count
    const continuationCount = originalInstance.continuation_count + 1;

    // Create a new instance as a continuation
    const newInstance = await instanceRepo.create({
        persona_definition_id: originalInstance.persona_definition_id,
        user_id: userId,
        workspace_id: workspaceId,
        task_description: additional_instructions,
        task_title: originalInstance.task_title
            ? `${originalInstance.task_title} (Continued)`
            : undefined,
        additional_context: originalInstance.additional_context,
        max_duration_hours: max_duration_hours || persona.default_max_duration_hours,
        max_cost_credits: max_cost_credits || persona.default_max_cost_credits,
        notification_config: originalInstance.notification_config,
        // Preserve template info
        template_id: originalInstance.template_id || undefined,
        template_variables: originalInstance.template_variables,
        // Set continuation tracking
        parent_instance_id: rootParentId,
        continuation_count: continuationCount
    });

    try {
        // Create a new thread for the continuation (linked to the same persona)
        const threadRepo = new ThreadRepository();
        const thread = await threadRepo.create({
            user_id: userId,
            workspace_id: workspaceId,
            agent_id: persona.id,
            title: `${persona.name}: Continuation #${continuationCount}`
        });

        // Create an execution record
        const executionRepo = new AgentExecutionRepository();
        const execution = await executionRepo.create({
            agent_id: persona.id,
            user_id: userId,
            thread_id: thread.id,
            status: "running",
            thread_history: [],
            iterations: 0
        });

        // Update the new instance with thread and execution IDs
        await instanceRepo.update(newInstance.id, {
            thread_id: thread.id,
            execution_id: execution.id,
            status: "initializing"
        });

        // Build context message that includes reference to previous work
        const contextMessage = buildContinuationMessage(
            originalInstance.task_description || "",
            additional_instructions,
            continuationCount
        );

        // Start the persona orchestrator workflow
        const client = await getTemporalClient();
        await client.workflow.start("personaOrchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId: execution.id,
            args: [
                {
                    executionId: execution.id,
                    personaInstanceId: newInstance.id,
                    userId,
                    workspaceId,
                    threadId: thread.id,
                    initialMessage: contextMessage,
                    // Pass parent instance ID for context retrieval
                    parentInstanceId: originalInstance.id,
                    isContinuation: true
                }
            ]
        });

        logger.info(
            {
                personaInstanceId: newInstance.id,
                parentInstanceId: originalInstance.id,
                continuationCount,
                threadId: thread.id,
                executionId: execution.id
            },
            "Persona instance continuation started"
        );

        // Return the new instance
        reply.code(201).send({
            success: true,
            data: {
                ...newInstance,
                thread_id: thread.id,
                execution_id: execution.id,
                status: "initializing",
                parent_instance_id: rootParentId,
                continuation_count: continuationCount
            },
            message: `Continuation #${continuationCount} started successfully`
        });
    } catch (error) {
        // If workflow start fails, update instance status to failed
        logger.error(
            { err: error, personaInstanceId: newInstance.id },
            "Failed to start persona continuation"
        );

        await instanceRepo.update(newInstance.id, {
            status: "failed",
            completion_reason: "failed"
        });

        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to start continuation"
        );
    }
}

/**
 * Build a context message for the continuation that references previous work
 */
function buildContinuationMessage(
    originalTask: string,
    additionalInstructions: string,
    continuationNumber: number
): string {
    return `This is a continuation (${continuationNumber > 1 ? `#${continuationNumber}` : "follow-up"}) of previous work.

## Previous Task
${originalTask}

## Additional Instructions
${additionalInstructions}

Please continue the work with these additional instructions. You have access to the context and deliverables from the previous execution.`;
}
