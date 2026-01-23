import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../temporal/client";
import { BadRequestError, NotFoundError } from "../../middleware";
import type { PersonaAdditionalContext } from "../../../storage/models/PersonaInstance";

const logger = createServiceLogger("PersonaInstances");

const createPersonaInstanceSchema = z.object({
    persona_slug: z.string().min(1),
    task_description: z.string().min(1).max(10000),
    task_title: z.string().max(255).optional(),
    additional_context: z
        .object({
            files: z.array(z.string()).optional(),
            knowledge_bases: z.array(z.string()).optional()
        })
        .passthrough()
        .optional(),
    max_duration_hours: z.number().positive().max(24).optional(),
    max_cost_credits: z.number().positive().max(10000).optional(),
    notification_config: z
        .object({
            on_approval_needed: z.boolean().optional(),
            on_completion: z.boolean().optional(),
            slack_channel_id: z.string().nullable().optional()
        })
        .optional()
});

type CreatePersonaInstanceBody = z.infer<typeof createPersonaInstanceSchema>;

export async function createPersonaInstanceHandler(
    request: FastifyRequest<{ Body: CreatePersonaInstanceBody }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;

    // Validate request body
    const parseResult = createPersonaInstanceSchema.safeParse(request.body);
    if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors.map((e) => e.message).join(", "));
    }
    const body = parseResult.data;

    // Get persona definition by slug
    const personaRepo = new PersonaDefinitionRepository();
    const persona = await personaRepo.findBySlug(body.persona_slug);

    if (!persona) {
        throw new NotFoundError(`Persona "${body.persona_slug}" not found`);
    }

    // Create persona instance
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.create({
        persona_definition_id: persona.id,
        user_id: userId,
        workspace_id: workspaceId,
        task_description: body.task_description,
        task_title: body.task_title,
        additional_context: body.additional_context as PersonaAdditionalContext | undefined,
        max_duration_hours: body.max_duration_hours || persona.default_max_duration_hours,
        max_cost_credits: body.max_cost_credits || persona.default_max_cost_credits,
        notification_config: body.notification_config
    });

    try {
        // Create a thread for the persona conversation
        const threadRepo = new ThreadRepository();
        const thread = await threadRepo.create({
            user_id: userId,
            workspace_id: workspaceId,
            agent_id: persona.id, // Use persona ID as agent ID for thread association
            title:
                body.task_title || `${persona.name}: ${body.task_description.substring(0, 50)}...`
        });

        // Create an execution record
        const executionRepo = new AgentExecutionRepository();
        const execution = await executionRepo.create({
            agent_id: persona.id, // Use persona ID as agent ID for execution tracking
            user_id: userId,
            thread_id: thread.id,
            status: "running",
            thread_history: [],
            iterations: 0
        });

        // Update persona instance with thread and execution IDs
        await instanceRepo.update(instance.id, {
            thread_id: thread.id,
            execution_id: execution.id,
            status: "initializing"
        });

        // Start the persona orchestrator workflow
        const client = await getTemporalClient();
        await client.workflow.start("personaOrchestratorWorkflow", {
            taskQueue: "flowmaestro-orchestrator",
            workflowId: execution.id,
            args: [
                {
                    executionId: execution.id,
                    personaInstanceId: instance.id,
                    userId,
                    workspaceId,
                    threadId: thread.id,
                    initialMessage: body.task_description
                }
            ]
        });

        logger.info(
            { personaInstanceId: instance.id, threadId: thread.id, executionId: execution.id },
            "Persona instance started"
        );

        // Return the instance with execution info
        reply.code(201).send({
            success: true,
            data: {
                ...instance,
                thread_id: thread.id,
                execution_id: execution.id,
                status: "initializing"
            }
        });
    } catch (error) {
        // If workflow start fails, update instance status to failed
        logger.error(
            { err: error, personaInstanceId: instance.id },
            "Failed to start persona execution"
        );

        await instanceRepo.update(instance.id, {
            status: "failed",
            completion_reason: "failed"
        });

        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to start persona execution"
        );
    }
}
