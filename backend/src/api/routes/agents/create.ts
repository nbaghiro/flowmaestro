import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { Tool, MemoryConfig } from "../../../storage/models/Agent";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { BadRequestError } from "../../middleware";

const toolSchema = z.object({
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(["workflow", "function", "knowledge_base"]),
    schema: z.record(z.any()),
    config: z.record(z.any())
});

const createAgentSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    model: z.string().min(1),
    provider: z.enum(["openai", "anthropic", "google", "cohere"]),
    connection_id: z.string().uuid().nullable().optional(),
    system_prompt: z.string().default("You are a helpful AI assistant."),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().min(1).max(100000).default(4096),
    max_iterations: z.number().min(1).max(1000).default(100),
    available_tools: z.array(toolSchema).default([]),
    memory_config: z
        .object({
            type: z.enum(["buffer", "summary", "vector"]).default("buffer"),
            max_messages: z.number().min(1).max(1000).default(50)
        })
        .default({
            type: "buffer",
            max_messages: 50
        })
});

export async function createAgentHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;
    const body = createAgentSchema.parse(request.body);

    const agentRepo = new AgentRepository();

    try {
        const agent = await agentRepo.create({
            user_id: userId,
            workspace_id: workspaceId,
            name: body.name,
            description: body.description,
            model: body.model,
            provider: body.provider,
            connection_id: body.connection_id || undefined,
            system_prompt: body.system_prompt,
            temperature: body.temperature,
            max_tokens: body.max_tokens,
            max_iterations: body.max_iterations,
            available_tools: body.available_tools as Tool[],
            memory_config: body.memory_config as MemoryConfig
        });

        reply.code(201).send({
            success: true,
            data: agent
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to create agent"
        );
    }
}
