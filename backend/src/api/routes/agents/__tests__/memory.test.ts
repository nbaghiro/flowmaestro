/**
 * Agent Memory Routes Integration Tests
 *
 * Tests for agent memory management endpoints including:
 * - List all working memories for an agent
 * - Get specific user's working memory
 * - Update user's working memory
 * - Delete user's working memory
 * - Search memories semantically
 * - Get memory statistics
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TYPES
// ============================================================================

interface WorkingMemory {
    id: string;
    agentId: string;
    userId: string;
    threadId: string | null;
    workingMemory: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

interface Agent {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    memory_config: {
        max_messages: number;
        embeddings_enabled?: boolean;
        working_memory_enabled?: boolean;
    };
}

interface SearchResult {
    content: string;
    message_role: string;
    similarity: number;
    execution_id: string;
    context_before: string[];
    context_after: string[];
}

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock agent repository
const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

// Mock working memory repository
const mockWorkingMemoryRepo = {
    listByAgent: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByAgent: jest.fn()
};

jest.mock("../../../../storage/repositories/WorkingMemoryRepository", () => ({
    WorkingMemoryRepository: jest.fn().mockImplementation(() => mockWorkingMemoryRepo)
}));

// Mock thread embedding repository
const mockThreadEmbeddingRepo = {
    searchSimilar: jest.fn(),
    getCountForAgent: jest.fn(),
    deleteByAgent: jest.fn()
};

jest.mock("../../../../storage/repositories/ThreadEmbeddingRepository", () => ({
    ThreadEmbeddingRepository: jest.fn().mockImplementation(() => mockThreadEmbeddingRepo)
}));

// Mock embedding service
const mockEmbeddingService = {
    generateEmbeddings: jest.fn()
};

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAgent(overrides: Partial<Agent> = {}): Agent {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Agent",
        memory_config: overrides.memory_config || { max_messages: 50 }
    };
}

function createMockWorkingMemory(overrides: Partial<WorkingMemory> = {}): WorkingMemory {
    return {
        id: overrides.id || uuidv4(),
        agentId: overrides.agentId || uuidv4(),
        userId: overrides.userId || uuidv4(),
        threadId: overrides.threadId ?? null,
        workingMemory: overrides.workingMemory || "Test working memory content",
        metadata: overrides.metadata ?? null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date()
    };
}

function createMockSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
    return {
        content: overrides.content || "Test search result content",
        message_role: overrides.message_role || "user",
        similarity: overrides.similarity ?? 0.85,
        execution_id: overrides.execution_id || uuidv4(),
        context_before: overrides.context_before || [],
        context_after: overrides.context_after || []
    };
}

function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset agent repository defaults
    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    // Reset working memory repository defaults
    mockWorkingMemoryRepo.listByAgent.mockResolvedValue([]);
    mockWorkingMemoryRepo.get.mockResolvedValue(null);
    mockWorkingMemoryRepo.update.mockImplementation(
        (data: { agentId: string; userId: string; workingMemory: string }) =>
            Promise.resolve(
                createMockWorkingMemory({
                    agentId: data.agentId,
                    userId: data.userId,
                    workingMemory: data.workingMemory
                })
            )
    );
    mockWorkingMemoryRepo.delete.mockResolvedValue(false);
    mockWorkingMemoryRepo.deleteByAgent.mockResolvedValue(0);

    // Reset embedding repository defaults
    mockThreadEmbeddingRepo.searchSimilar.mockResolvedValue([]);
    mockThreadEmbeddingRepo.getCountForAgent.mockResolvedValue(0);
    mockThreadEmbeddingRepo.deleteByAgent.mockResolvedValue(0);

    // Reset embedding service defaults
    mockEmbeddingService.generateEmbeddings.mockResolvedValue({
        embeddings: [[0.1, 0.2, 0.3]],
        tokens_used: 10
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Memory Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // LIST MEMORIES
    // ========================================================================

    describe("GET /agents/:id/memory", () => {
        it("should list all working memories for an agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            const memories = [
                createMockWorkingMemory({ agentId, userId: uuidv4() }),
                createMockWorkingMemory({ agentId, userId: uuidv4() })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue(memories);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<unknown[]>(response);
            expect(body.data).toHaveLength(2);
        });

        it("should return empty list when no memories exist", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<unknown[]>(response);
            expect(body.data).toHaveLength(0);
        });

        it("should paginate results", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            const memories = Array.from({ length: 25 }, () => createMockWorkingMemory({ agentId }));

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue(memories);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory`,
                query: { page: "1", per_page: "10" }
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: unknown[];
                pagination: {
                    page: number;
                    per_page: number;
                    total_count: number;
                    total_pages: number;
                    has_next: boolean;
                    has_prev: boolean;
                };
            }>();
            expect(body.data).toHaveLength(10);
            expect(body.pagination.total_count).toBe(25);
            expect(body.pagination.total_pages).toBe(3);
            expect(body.pagination.has_next).toBe(true);
            expect(body.pagination.has_prev).toBe(false);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/memory`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid agent UUID", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/agents/not-a-uuid/memory"
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agents/${uuidv4()}/memory`
            });

            expectErrorResponse(response, 401);
        });
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
    // GET SPECIFIC USER MEMORY
    // ========================================================================

    describe("GET /agents/:id/memory/:userId", () => {
        it("should return specific user's working memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const memoryUserId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            const memory = createMockWorkingMemory({
                agentId,
                userId: memoryUserId,
                workingMemory: "User-specific memory content",
                metadata: { key: "value" }
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.get.mockResolvedValue(memory);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory/${memoryUserId}`
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    agent_id: string;
                    user_id: string;
                    working_memory: string;
                    metadata: Record<string, unknown>;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.agent_id).toBe(agentId);
            expect(body.data.user_id).toBe(memoryUserId);
            expect(body.data.working_memory).toBe("User-specific memory content");
            expect(body.data.metadata).toEqual({ key: "value" });
        });

        it("should return 404 for non-existent memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.get.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/memory/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid user UUID", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/memory/not-a-uuid`
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // UPDATE USER MEMORY
    // ========================================================================

    describe("PUT /agents/:id/memory/:userId", () => {
        it("should update user's working memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const memoryUserId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            const updatedMemory = createMockWorkingMemory({
                agentId,
                userId: memoryUserId,
                workingMemory: "Updated memory content"
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.update.mockResolvedValue(updatedMemory);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}/memory/${memoryUserId}`,
                payload: {
                    working_memory: "Updated memory content"
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    agent_id: string;
                    user_id: string;
                    working_memory: string;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.working_memory).toBe("Updated memory content");
        });

        it("should update memory with metadata", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const memoryUserId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            const updatedMemory = createMockWorkingMemory({
                agentId,
                userId: memoryUserId,
                workingMemory: "Memory with metadata",
                metadata: { custom: "data" }
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.update.mockResolvedValue(updatedMemory);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}/memory/${memoryUserId}`,
                payload: {
                    working_memory: "Memory with metadata",
                    metadata: { custom: "data" }
                }
            });

            expectStatus(response, 200);
            expect(mockWorkingMemoryRepo.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    agentId,
                    userId: memoryUserId,
                    workingMemory: "Memory with metadata",
                    metadata: { custom: "data" }
                })
            );
        });

        it("should return 400 for missing working_memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const memoryUserId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}/memory/${memoryUserId}`,
                payload: {}
            });

            expectStatus(response, 400);
        });

        it("should return 400 for empty working_memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const memoryUserId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}/memory/${memoryUserId}`,
                payload: {
                    working_memory: ""
                }
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${uuidv4()}/memory/${uuidv4()}`,
                payload: {
                    working_memory: "Some content"
                }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "PUT",
                url: `/agents/${uuidv4()}/memory/${uuidv4()}`,
                payload: {
                    working_memory: "Some content"
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // DELETE USER MEMORY
    // ========================================================================

    describe("DELETE /agents/:id/memory/:userId", () => {
        it("should delete user's working memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const memoryUserId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${agentId}/memory/${memoryUserId}`
            });

            expectStatus(response, 200);
            const body = response.json<{
                success: boolean;
                data: {
                    agent_id: string;
                    user_id: string;
                    deleted: boolean;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.agent_id).toBe(agentId);
            expect(body.data.user_id).toBe(memoryUserId);
            expect(body.data.deleted).toBe(true);
        });

        it("should return 404 for non-existent memory", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockWorkingMemoryRepo.delete.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${agentId}/memory/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${uuidv4()}/memory/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "DELETE",
                url: `/agents/${uuidv4()}/memory/${uuidv4()}`
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

            // Should still succeed but with 0 embeddings deleted
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
            // findByIdAndWorkspaceId returns null because workspace doesn't match
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
