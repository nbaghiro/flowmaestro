/**
 * Agent Memory Route Handlers
 *
 * Handlers for agent working memory management including:
 * - List all working memories for an agent
 * - Get specific user's working memory
 * - Update user's working memory
 * - Delete user's working memory
 * - Search memories semantically
 * - Get memory statistics
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { JsonObject } from "@flowmaestro/shared";
import { createRequestLogger } from "../../../core/logging";
import { EmbeddingService } from "../../../services/embeddings/EmbeddingService";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ThreadEmbeddingRepository } from "../../../storage/repositories/ThreadEmbeddingRepository";
import { WorkingMemoryRepository } from "../../../storage/repositories/WorkingMemoryRepository";
import { NotFoundError, ValidationError } from "../../middleware";

// Schema definitions
const agentIdParamsSchema = z.object({
    id: z.string().uuid()
});

const memoryParamsSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid()
});

const listMemoriesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    per_page: z.coerce.number().int().positive().max(100).default(20)
});

const updateMemoryBodySchema = z.object({
    working_memory: z.string().min(1),
    metadata: z.record(z.unknown()).optional()
});

const searchMemoryBodySchema = z.object({
    query: z.string().min(1),
    top_k: z.number().int().positive().max(50).default(10),
    similarity_threshold: z.number().min(0).max(1).default(0.7),
    user_id: z.string().uuid().optional()
});

/**
 * GET /agents/:id/memory - List all working memories for an agent
 */
export async function listMemoriesHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const { id: agentId } = agentIdParamsSchema.parse(request.params);
    const { page, per_page } = listMemoriesQuerySchema.parse(request.query);

    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Get all memories for this agent
    const allMemories = await memoryRepo.listByAgent(agentId);
    const total = allMemories.length;

    // Apply pagination
    const offset = (page - 1) * per_page;
    const paginatedMemories = allMemories.slice(offset, offset + per_page);

    const formattedMemories = paginatedMemories.map((m) => ({
        user_id: m.userId,
        thread_id: m.threadId,
        working_memory: m.workingMemory,
        metadata: m.metadata,
        created_at: m.createdAt.toISOString(),
        updated_at: m.updatedAt.toISOString()
    }));

    logger.info({ agentId, total, page, per_page }, "Listed agent working memories");

    const totalPages = Math.ceil(total / per_page);
    reply.send({
        success: true,
        data: formattedMemories,
        pagination: {
            page,
            per_page,
            total_count: total,
            total_pages: totalPages,
            has_next: page < totalPages,
            has_prev: page > 1
        }
    });
}

/**
 * GET /agents/:id/memory/:userId - Get specific user's working memory
 */
export async function getMemoryHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const { id: agentId, userId } = memoryParamsSchema.parse(request.params);

    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Get the memory
    const memory = await memoryRepo.get(agentId, userId);
    if (!memory) {
        throw new NotFoundError("Working memory not found");
    }

    logger.info({ agentId, userId }, "Retrieved user working memory");

    reply.send({
        success: true,
        data: {
            agent_id: memory.agentId,
            user_id: memory.userId,
            thread_id: memory.threadId,
            working_memory: memory.workingMemory,
            metadata: memory.metadata,
            created_at: memory.createdAt.toISOString(),
            updated_at: memory.updatedAt.toISOString()
        }
    });
}

/**
 * PUT /agents/:id/memory/:userId - Update user's working memory
 */
export async function updateMemoryHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const { id: agentId, userId } = memoryParamsSchema.parse(request.params);

    const parseResult = updateMemoryBodySchema.safeParse(request.body);
    if (!parseResult.success) {
        throw new ValidationError("working_memory is required and must be a non-empty string");
    }
    const body = parseResult.data;

    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Update the memory (upsert)
    const memory = await memoryRepo.update({
        agentId,
        userId,
        workingMemory: body.working_memory.trim(),
        metadata: body.metadata as JsonObject | undefined
    });

    logger.info({ agentId, userId }, "Updated user working memory");

    reply.send({
        success: true,
        data: {
            agent_id: memory.agentId,
            user_id: memory.userId,
            thread_id: memory.threadId,
            working_memory: memory.workingMemory,
            metadata: memory.metadata,
            created_at: memory.createdAt.toISOString(),
            updated_at: memory.updatedAt.toISOString()
        }
    });
}

/**
 * DELETE /agents/:id/memory/:userId - Delete user's working memory
 */
export async function deleteMemoryHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const { id: agentId, userId } = memoryParamsSchema.parse(request.params);

    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Delete the memory
    const deleted = await memoryRepo.delete(agentId, userId);
    if (!deleted) {
        throw new NotFoundError("Working memory not found");
    }

    logger.info({ agentId, userId }, "Deleted user working memory");

    reply.send({
        success: true,
        data: {
            agent_id: agentId,
            user_id: userId,
            deleted: true
        }
    });
}

/**
 * POST /agents/:id/memory/search - Semantic search across memories
 */
export async function searchMemoryHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;
    const { id: agentId } = agentIdParamsSchema.parse(request.params);

    const parseResult = searchMemoryBodySchema.safeParse(request.body);
    if (!parseResult.success) {
        throw new ValidationError("query is required and must be a non-empty string");
    }
    const body = parseResult.data;

    const agentRepo = new AgentRepository();
    const embeddingRepo = new ThreadEmbeddingRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Generate embedding for the query
    const embeddingService = new EmbeddingService();
    const embeddingResult = await embeddingService.generateEmbeddings(
        [body.query],
        {
            model: "text-embedding-3-small",
            provider: "openai",
            dimensions: 1536
        },
        userId
    );

    if (embeddingResult.embeddings.length === 0) {
        throw new Error("Failed to generate query embedding");
    }

    // Search for similar embeddings
    const searchResults = await embeddingRepo.searchSimilar({
        agent_id: agentId,
        user_id: body.user_id,
        query_embedding: embeddingResult.embeddings[0],
        top_k: body.top_k,
        similarity_threshold: body.similarity_threshold,
        context_window: 2
    });

    const formattedResults = searchResults.map((r) => ({
        content: r.content,
        role: r.message_role,
        similarity: r.similarity,
        execution_id: r.execution_id,
        context_before: r.context_before,
        context_after: r.context_after
    }));

    logger.info(
        { agentId, query: body.query, resultCount: searchResults.length },
        "Executed memory search"
    );

    reply.send({
        success: true,
        data: {
            agent_id: agentId,
            query: body.query,
            results: formattedResults,
            result_count: formattedResults.length
        }
    });
}

/**
 * POST /agents/:id/memory/clear - Clear all memory for an agent
 */
export async function clearAllMemoryHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const { id: agentId } = agentIdParamsSchema.parse(request.params);

    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();
    const embeddingRepo = new ThreadEmbeddingRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Delete all working memories for this agent
    const workingMemoriesDeleted = await memoryRepo.deleteByAgent(agentId);

    // Delete all embeddings for this agent (wrap in try/catch since table may not exist)
    let embeddingsDeleted = 0;
    try {
        embeddingsDeleted = await embeddingRepo.deleteByAgent(agentId);
    } catch (err) {
        logger.warn(
            { agentId, err },
            "Failed to delete embeddings - agent_conversation_embeddings table may not exist"
        );
    }

    logger.info({ agentId, workingMemoriesDeleted, embeddingsDeleted }, "Cleared all agent memory");

    reply.send({
        success: true,
        data: {
            agent_id: agentId,
            working_memories_deleted: workingMemoriesDeleted,
            embeddings_deleted: embeddingsDeleted
        }
    });
}

/**
 * GET /agents/:id/memory/stats - Get memory statistics for an agent
 */
export async function getMemoryStatsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const { id: agentId } = agentIdParamsSchema.parse(request.params);

    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();
    const embeddingRepo = new ThreadEmbeddingRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Get working memory count
    const workingMemories = await memoryRepo.listByAgent(agentId);

    // Get embedding count - wrap in try/catch since table may not exist if pgvector isn't installed
    let embeddingCount = 0;
    try {
        embeddingCount = await embeddingRepo.getCountForAgent(agentId);
    } catch (err) {
        logger.warn(
            { agentId, err },
            "Failed to get embedding count - agent_conversation_embeddings table may not exist"
        );
    }

    logger.info({ agentId }, "Retrieved memory stats");

    reply.send({
        success: true,
        data: {
            agent_id: agentId,
            working_memory_count: workingMemories.length,
            embedding_count: embeddingCount,
            memory_config: agent.memory_config
        }
    });
}
