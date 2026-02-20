/**
 * Agent Memory Operations Tests
 *
 * Tests for memory stats, clear, search, and multi-tenant isolation.
 */

import { FastifyInstance } from "fastify";
import {
    mockAgentRepo,
    mockWorkingMemoryRepo,
    mockThreadEmbeddingRepo,
    mockEmbeddingService,
    createMockAgent,
    createMockWorkingMemory,
    createMockSearchResult,
    resetAllMocks,
    createMemoryTestServer,
    closeMemoryTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    expectStatus,
    expectErrorResponse,
    uuidv4,
    DEFAULT_TEST_WORKSPACE_ID
} from "./helpers/memory-test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories/WorkingMemoryRepository", () => ({
    WorkingMemoryRepository: jest.fn().mockImplementation(() => mockWorkingMemoryRepo)
}));

jest.mock("../../../../storage/repositories/ThreadEmbeddingRepository", () => ({
    ThreadEmbeddingRepository: jest.fn().mockImplementation(() => mockThreadEmbeddingRepo)
}));

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Memory Operations", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createMemoryTestServer();
    });

    afterAll(async () => {
        await closeMemoryTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // GET MEMORY STATS
    // ========================================================================
    describe("GET /agents/:id/memory/stats", () => {
        it("should return memory statistics for an agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                memory_config: {
                    max_messages: 100,
                    embeddings_enabled: true,
                    working_memory_enabled: true
                }
            });
            const memories = [
                createMockWorkingMemory({ agentId }),
                createMockWorkingMemory({ agentId })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue(memories);
            mockThreadEmbeddingRepo.getCountForAgent.mockResolvedValue(150);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory/stats`
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    agent_id: string;
                    working_memory_count: number;
                    embedding_count: number;
                    memory_config: {
                        max_messages: number;
                        embeddings_enabled?: boolean;
                        working_memory_enabled?: boolean;
                    };
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.agent_id).toBe(agentId);
            expect(body.data.working_memory_count).toBe(2);
            expect(body.data.embedding_count).toBe(150);
            expect(body.data.memory_config.max_messages).toBe(100);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/memory/stats`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agents/${uuidv4()}/memory/stats`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // CLEAR ALL MEMORY
    // ========================================================================
    describe("POST /agents/:id/memory/clear", () => {
        it("should clear all memory for an agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.deleteByAgent.mockResolvedValue(5);
            mockThreadEmbeddingRepo.deleteByAgent.mockResolvedValue(100);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/clear`
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    agent_id: string;
                    working_memories_deleted: number;
                    embeddings_deleted: number;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.agent_id).toBe(agentId);
            expect(body.data.working_memories_deleted).toBe(5);
            expect(body.data.embeddings_deleted).toBe(100);
        });

        it("should return zeros when no memory exists", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.deleteByAgent.mockResolvedValue(0);
            mockThreadEmbeddingRepo.deleteByAgent.mockResolvedValue(0);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/clear`
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    working_memories_deleted: number;
                    embeddings_deleted: number;
                };
            }>();
            expect(body.data.working_memories_deleted).toBe(0);
            expect(body.data.embeddings_deleted).toBe(0);
        });

        it("should handle embedding deletion failure gracefully", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.deleteByAgent.mockResolvedValue(3);
            mockThreadEmbeddingRepo.deleteByAgent.mockRejectedValue(
                new Error("Table does not exist")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/clear`
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    working_memories_deleted: number;
                    embeddings_deleted: number;
                };
            }>();
            expect(body.data.working_memories_deleted).toBe(3);
            expect(body.data.embeddings_deleted).toBe(0);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/memory/clear`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid agent UUID", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents/not-a-uuid/memory/clear"
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/agents/${uuidv4()}/memory/clear`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // SEARCH MEMORIES
    // ========================================================================
    describe("POST /agents/:id/memory/search", () => {
        it("should search memories semantically", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            const searchResults = [
                createMockSearchResult({ content: "Relevant result 1", similarity: 0.9 }),
                createMockSearchResult({ content: "Relevant result 2", similarity: 0.85 })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]],
                tokens_used: 10
            });
            mockThreadEmbeddingRepo.searchSimilar.mockResolvedValue(searchResults);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/search`,
                payload: {
                    query: "test search query"
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    agent_id: string;
                    query: string;
                    results: Array<{
                        content: string;
                        similarity: number;
                    }>;
                    result_count: number;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.agent_id).toBe(agentId);
            expect(body.data.query).toBe("test search query");
            expect(body.data.results).toHaveLength(2);
            expect(body.data.result_count).toBe(2);
        });

        it("should search with custom parameters", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const specificUserId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]],
                tokens_used: 10
            });
            mockThreadEmbeddingRepo.searchSimilar.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/search`,
                payload: {
                    query: "test query",
                    top_k: 5,
                    similarity_threshold: 0.8,
                    user_id: specificUserId
                }
            });

            expect(mockThreadEmbeddingRepo.searchSimilar).toHaveBeenCalledWith(
                expect.objectContaining({
                    agent_id: agentId,
                    user_id: specificUserId,
                    top_k: 5,
                    similarity_threshold: 0.8
                })
            );
        });

        it("should return empty results when no matches found", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]],
                tokens_used: 10
            });
            mockThreadEmbeddingRepo.searchSimilar.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/search`,
                payload: {
                    query: "no matches query"
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    results: unknown[];
                    result_count: number;
                };
            }>();
            expect(body.data.results).toHaveLength(0);
            expect(body.data.result_count).toBe(0);
        });

        it("should return 400 for missing query", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/search`,
                payload: {}
            });

            expectStatus(response, 400);
        });

        it("should return 400 for empty query", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/search`,
                payload: {
                    query: ""
                }
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/memory/search`,
                payload: {
                    query: "test query"
                }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/agents/${uuidv4()}/memory/search`,
                payload: {
                    query: "test query"
                }
            });

            expectErrorResponse(response, 401);
        });

        it("should handle embedding service failure", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                embeddings: [],
                tokens_used: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/memory/search`,
                payload: {
                    query: "test query"
                }
            });

            expectStatus(response, 500);
        });
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION
    // ========================================================================
    describe("Multi-tenant Isolation", () => {
        it("should not access memories from other workspaces", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/memory`
            });

            expectErrorResponse(response, 404);
            expect(mockWorkingMemoryRepo.listByAgent).not.toHaveBeenCalled();
        });

        it("should verify workspace on memory operations", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory`
            });

            expect(mockAgentRepo.findByIdAndWorkspaceId).toHaveBeenCalledWith(
                agentId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });
    });
});
