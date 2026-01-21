import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { BadRequestError, NotFoundError } from "../../middleware";
import type { PersonaAdditionalContext } from "../../../storage/models/PersonaInstance";

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

    // TODO: In a full implementation, we would:
    // 1. Create a thread for the conversation
    // 2. Start an agent execution with the persona's system prompt + task description
    // 3. Set up the sandbox if needed
    // For now, we just create the instance record

    reply.code(201).send({
        success: true,
        data: instance
    });
}
