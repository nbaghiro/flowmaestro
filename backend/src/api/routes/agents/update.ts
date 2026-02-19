import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { Tool, MemoryConfig } from "../../../storage/models/Agent";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { NotFoundError, BadRequestError } from "../../middleware";

const logger = createServiceLogger("AgentUpdate");

const updateAgentParamsSchema = z.object({
    id: z.string().uuid()
});

const toolSchema = z.object({
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(["workflow", "function", "knowledge_base"]),
    schema: z.record(z.any()),
    config: z.record(z.any())
});

const updateAgentSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    model: z.string().min(1).optional(),
    provider: z.enum(["openai", "anthropic", "google", "xai", "cohere", "huggingface"]).optional(),
    connection_id: z.string().uuid().nullable().optional(),
    system_prompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().min(1).max(100000).optional(),
    max_iterations: z.number().min(1).max(1000).optional(),
    available_tools: z.array(toolSchema).optional(),
    memory_config: z
        .object({
            max_messages: z.number().min(1).max(1000),
            embeddings_enabled: z.boolean().optional(),
            working_memory_enabled: z.boolean().optional()
        })
        .optional(),
    metadata: z.record(z.any()).optional()
});

export async function updateAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    // Log at very start before any validation
    logger.info(
        { params: request.params, bodyKeys: Object.keys((request.body as object) || {}) },
        "updateAgentHandler called"
    );

    const workspaceId = request.workspace!.id;
    const { id } = updateAgentParamsSchema.parse(request.params);
    const body = updateAgentSchema.parse(request.body);

    logger.info(
        { agentId: id, hasMetadata: body.metadata !== undefined, metadata: body.metadata },
        "Agent update validated"
    );

    const agentRepo = new AgentRepository();

    // Check if agent exists and belongs to workspace
    const existingAgent = await agentRepo.findByIdAndWorkspaceId(id, workspaceId);
    if (!existingAgent) {
        throw new NotFoundError("Agent not found");
    }

    try {
        const updated = await agentRepo.update(id, {
            ...(body.name && { name: body.name }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.model && { model: body.model }),
            ...(body.provider && { provider: body.provider }),
            ...(body.connection_id !== undefined && {
                connection_id: body.connection_id || undefined
            }),
            ...(body.system_prompt && { system_prompt: body.system_prompt }),
            ...(body.temperature !== undefined && { temperature: body.temperature }),
            ...(body.max_tokens && { max_tokens: body.max_tokens }),
            ...(body.max_iterations && { max_iterations: body.max_iterations }),
            ...(body.available_tools && { available_tools: body.available_tools as Tool[] }),
            ...(body.memory_config && { memory_config: body.memory_config as MemoryConfig }),
            ...(body.metadata !== undefined && { metadata: body.metadata })
        });

        if (!updated) {
            throw new NotFoundError("Agent not found");
        }

        logger.info(
            { agentId: id, updatedMetadata: updated.metadata },
            "Agent updated successfully"
        );

        reply.send({
            success: true,
            data: updated
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to update agent"
        );
    }
}
