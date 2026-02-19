import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { JsonObject } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import { EmbeddingService } from "../../../../services/embeddings/EmbeddingService";
import { AgentRepository } from "../../../../storage/repositories/AgentRepository";
import { ThreadEmbeddingRepository } from "../../../../storage/repositories/ThreadEmbeddingRepository";
import { WorkingMemoryRepository } from "../../../../storage/repositories/WorkingMemoryRepository";
import { requireScopes } from "../../../middleware/scope-checker";
import {
    sendSuccess,
    sendPaginated,
    sendNotFound,
    sendError,
    sendValidationError,
    parsePaginationQuery
} from "../response-helpers";

const logger = createServiceLogger("AgentMemoryRoutes");

/**
 * Agent memory management routes.
 * Provides API endpoints for viewing, updating, and searching agent working memory.
 */
export async function agentMemoryRoutes(fastify: FastifyInstance): Promise<void> {
    const agentRepo = new AgentRepository();
    const memoryRepo = new WorkingMemoryRepository();
    const embeddingRepo = new ThreadEmbeddingRepository();

    // GET /api/v1/agents/:agentId/memory - List all working memories for an agent
    fastify.get<{ Params: { agentId: string } }>(
        "/:agentId/memory",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (request: FastifyRequest<{ Params: { agentId: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const agentId = request.params.agentId;
            const { page, per_page, offset } = parsePaginationQuery(
                request.query as Record<string, unknown>
            );

            // Verify agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
            if (!agent) {
                return sendNotFound(reply, "Agent", agentId);
            }

            // Get all memories for this agent
            const allMemories = await memoryRepo.listByAgent(agentId);
            const total = allMemories.length;

            // Apply pagination
            const paginatedMemories = allMemories.slice(offset, offset + per_page);

            const publicMemories = paginatedMemories.map((m) => ({
                user_id: m.userId,
                working_memory: m.workingMemory,
                metadata: m.metadata,
                created_at: m.createdAt.toISOString(),
                updated_at: m.updatedAt.toISOString()
            }));

            logger.info({ agentId, total, page, per_page }, "Listed agent working memories");

            return sendPaginated(reply, publicMemories, {
                page,
                per_page,
                total_count: total
            });
        }
    );

    // GET /api/v1/agents/:agentId/memory/:userId - Get specific user's working memory
    fastify.get<{ Params: { agentId: string; userId: string } }>(
        "/:agentId/memory/:userId",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (
            request: FastifyRequest<{ Params: { agentId: string; userId: string } }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const { agentId, userId } = request.params;

            // Verify agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
            if (!agent) {
                return sendNotFound(reply, "Agent", agentId);
            }

            // Get the memory
            const memory = await memoryRepo.get(agentId, userId);
            if (!memory) {
                return sendNotFound(reply, "Working memory", `${agentId}/${userId}`);
            }

            logger.info({ agentId, userId }, "Retrieved user working memory");

            return sendSuccess(reply, {
                agent_id: memory.agentId,
                user_id: memory.userId,
                working_memory: memory.workingMemory,
                metadata: memory.metadata,
                created_at: memory.createdAt.toISOString(),
                updated_at: memory.updatedAt.toISOString()
            });
        }
    );

    // PUT /api/v1/agents/:agentId/memory/:userId - Update user's working memory
    fastify.put<{
        Params: { agentId: string; userId: string };
        Body: { working_memory: string; metadata?: JsonObject };
    }>(
        "/:agentId/memory/:userId",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (
            request: FastifyRequest<{
                Params: { agentId: string; userId: string };
                Body: { working_memory: string; metadata?: JsonObject };
            }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const { agentId, userId } = request.params;
            const body = request.body || {};

            if (
                typeof body.working_memory !== "string" ||
                body.working_memory.trim().length === 0
            ) {
                return sendValidationError(
                    reply,
                    "working_memory is required and must be a non-empty string"
                );
            }

            // Verify agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
            if (!agent) {
                return sendNotFound(reply, "Agent", agentId);
            }

            // Update the memory (upsert)
            const memory = await memoryRepo.update({
                agentId,
                userId,
                workingMemory: body.working_memory.trim(),
                metadata: body.metadata
            });

            logger.info({ agentId, userId }, "Updated user working memory");

            return sendSuccess(reply, {
                agent_id: memory.agentId,
                user_id: memory.userId,
                working_memory: memory.workingMemory,
                metadata: memory.metadata,
                created_at: memory.createdAt.toISOString(),
                updated_at: memory.updatedAt.toISOString()
            });
        }
    );

    // DELETE /api/v1/agents/:agentId/memory/:userId - Delete user's working memory
    fastify.delete<{ Params: { agentId: string; userId: string } }>(
        "/:agentId/memory/:userId",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (
            request: FastifyRequest<{ Params: { agentId: string; userId: string } }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const { agentId, userId } = request.params;

            // Verify agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
            if (!agent) {
                return sendNotFound(reply, "Agent", agentId);
            }

            // Delete the memory
            const deleted = await memoryRepo.delete(agentId, userId);
            if (!deleted) {
                return sendNotFound(reply, "Working memory", `${agentId}/${userId}`);
            }

            logger.info({ agentId, userId }, "Deleted user working memory");

            return sendSuccess(reply, {
                agent_id: agentId,
                user_id: userId,
                deleted: true
            });
        }
    );

    // POST /api/v1/agents/:agentId/memory/search - Semantic search across memories
    fastify.post<{
        Params: { agentId: string };
        Body: {
            query: string;
            top_k?: number;
            similarity_threshold?: number;
            user_id?: string;
        };
    }>(
        "/:agentId/memory/search",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (
            request: FastifyRequest<{
                Params: { agentId: string };
                Body: {
                    query: string;
                    top_k?: number;
                    similarity_threshold?: number;
                    user_id?: string;
                };
            }>,
            reply: FastifyReply
        ) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const apiKeyUserId = request.apiKeyUserId!;
            const agentId = request.params.agentId;
            const body = request.body || {};

            if (typeof body.query !== "string" || body.query.trim().length === 0) {
                return sendValidationError(
                    reply,
                    "query is required and must be a non-empty string"
                );
            }

            const query = body.query.trim();
            const topK = Math.min(50, Math.max(1, body.top_k || 10));
            const similarityThreshold = Math.min(1, Math.max(0, body.similarity_threshold || 0.7));
            const userId = body.user_id;

            // Verify agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
            if (!agent) {
                return sendNotFound(reply, "Agent", agentId);
            }

            try {
                // Generate embedding for the query
                const embeddingService = new EmbeddingService();
                const embeddingResult = await embeddingService.generateEmbeddings(
                    [query],
                    {
                        model: "text-embedding-3-small",
                        provider: "openai",
                        dimensions: 1536
                    },
                    apiKeyUserId
                );

                if (embeddingResult.embeddings.length === 0) {
                    return sendError(
                        reply,
                        500,
                        "internal_error",
                        "Failed to generate query embedding"
                    );
                }

                // Search for similar embeddings
                const searchResults = await embeddingRepo.searchSimilar({
                    agent_id: agentId,
                    user_id: userId,
                    query_embedding: embeddingResult.embeddings[0],
                    top_k: topK,
                    similarity_threshold: similarityThreshold,
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
                    {
                        agentId,
                        query,
                        resultCount: searchResults.length,
                        topK,
                        similarityThreshold
                    },
                    "Executed memory search"
                );

                return sendSuccess(reply, {
                    agent_id: agentId,
                    query,
                    results: formattedResults,
                    result_count: formattedResults.length
                });
            } catch (error) {
                logger.error({ error, agentId, query }, "Memory search failed");
                return sendError(
                    reply,
                    500,
                    "internal_error",
                    error instanceof Error ? error.message : "Memory search failed"
                );
            }
        }
    );

    // GET /api/v1/agents/:agentId/memory/stats - Get memory statistics for an agent
    fastify.get<{ Params: { agentId: string } }>(
        "/:agentId/memory/stats",
        {
            preHandler: [requireScopes("agents:read")]
        },
        async (request: FastifyRequest<{ Params: { agentId: string } }>, reply: FastifyReply) => {
            const workspaceId = request.apiKeyWorkspaceId!;
            const agentId = request.params.agentId;

            // Verify agent exists and belongs to workspace
            const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
            if (!agent) {
                return sendNotFound(reply, "Agent", agentId);
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

            return sendSuccess(reply, {
                agent_id: agentId,
                working_memory_count: workingMemories.length,
                embedding_count: embeddingCount,
                memory_config: agent.memory_config
            });
        }
    );
}
