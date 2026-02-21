import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { PersonaCreditThresholdConfig } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../core/logging";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceConnectionRepository } from "../../../storage/repositories/PersonaInstanceConnectionRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { PersonaTaskTemplateRepository } from "../../../storage/repositories/PersonaTaskTemplateRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { getTemporalClient } from "../../../temporal/client";
import { BadRequestError, NotFoundError } from "../../middleware";
import {
    validateStructuredInputs,
    applyInputDefaults
} from "../../schemas/persona-input-validator";
import type { PersonaAdditionalContext } from "../../../storage/models/PersonaInstance";

const logger = createServiceLogger("PersonaInstances");

const connectionGrantSchema = z.object({
    connection_id: z.string().uuid(),
    scopes: z.array(z.string()).optional()
});

const creditThresholdConfigSchema = z.object({
    thresholds: z.array(z.number().min(0).max(100)).default([50, 75, 90]),
    pause_at_limit: z.boolean().default(false),
    notified_thresholds: z.array(z.number()).default([])
});

const createPersonaInstanceSchema = z.object({
    persona_slug: z.string().min(1),
    task_description: z.string().min(1).max(10000),
    task_title: z.string().max(255).optional(),
    // Structured inputs based on persona's input_fields
    structured_inputs: z.record(z.any()).optional(),
    additional_context: z
        .object({
            files: z.array(z.string()).optional(),
            knowledge_bases: z.array(z.string()).optional()
        })
        .passthrough()
        .optional(),
    max_duration_hours: z.number().positive().max(24).optional(),
    max_cost_credits: z.number().positive().max(10000).optional(),
    // Credit threshold configuration
    credit_threshold_config: creditThresholdConfigSchema.optional(),
    notification_config: z
        .object({
            on_approval_needed: z.boolean().optional(),
            on_completion: z.boolean().optional(),
            slack_channel_id: z.string().nullable().optional()
        })
        .optional(),
    // Template support
    template_id: z.string().uuid().optional(),
    template_variables: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
        .optional(),
    // Clarification control
    skip_clarification: z.boolean().optional(),
    // Connection grants - connections this persona can access
    connections: z.array(connectionGrantSchema).optional()
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

    // Validate structured inputs against persona's input_fields definition
    if (persona.input_fields && persona.input_fields.length > 0) {
        const validationResult = validateStructuredInputs(
            persona.input_fields,
            body.structured_inputs
        );

        if (!validationResult.success) {
            const errorMessages = validationResult
                .errors!.map((e) => `${e.path}: ${e.message}`)
                .join("; ");
            throw new BadRequestError(`Invalid structured inputs: ${errorMessages}`);
        }
    }

    // Apply default values to structured inputs
    const structuredInputsWithDefaults = persona.input_fields
        ? applyInputDefaults(persona.input_fields, body.structured_inputs)
        : body.structured_inputs;

    // Build default credit threshold config if not provided
    const defaultCreditThresholdConfig: PersonaCreditThresholdConfig = {
        thresholds: [50, 75, 90],
        pause_at_limit: false,
        notified_thresholds: []
    };

    const creditThresholdConfig = body.credit_threshold_config || defaultCreditThresholdConfig;

    // Create persona instance
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.create({
        persona_definition_id: persona.id,
        user_id: userId,
        workspace_id: workspaceId,
        task_description: body.task_description,
        task_title: body.task_title,
        structured_inputs: structuredInputsWithDefaults,
        additional_context: body.additional_context as PersonaAdditionalContext | undefined,
        max_duration_hours: body.max_duration_hours || persona.default_max_duration_hours,
        max_cost_credits: body.max_cost_credits || persona.default_max_cost_credits,
        credit_threshold_config: creditThresholdConfig,
        notification_config: body.notification_config,
        template_id: body.template_id,
        template_variables: body.template_variables,
        skip_clarification: body.skip_clarification
    });

    // If a template was used, increment its usage count
    if (body.template_id) {
        const templateRepo = new PersonaTaskTemplateRepository();
        await templateRepo.incrementUsageCount(body.template_id);
    }

    // Grant connections to the instance if provided
    if (body.connections && body.connections.length > 0) {
        const connRepo = new ConnectionRepository();
        const instanceConnRepo = new PersonaInstanceConnectionRepository();

        for (const connGrant of body.connections) {
            // Verify connection exists and belongs to workspace
            const connection = await connRepo.findByIdAndWorkspaceId(
                connGrant.connection_id,
                workspaceId
            );

            if (!connection) {
                logger.warn(
                    { connectionId: connGrant.connection_id, workspaceId },
                    "Connection not found or not in workspace, skipping"
                );
                continue;
            }

            // Grant the connection to the instance
            await instanceConnRepo.create({
                instance_id: instance.id,
                connection_id: connGrant.connection_id,
                granted_scopes: connGrant.scopes
            });

            logger.info(
                {
                    personaInstanceId: instance.id,
                    connectionId: connGrant.connection_id,
                    provider: connection.provider,
                    scopes: connGrant.scopes
                },
                "Connection granted to persona instance"
            );
        }
    }

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
