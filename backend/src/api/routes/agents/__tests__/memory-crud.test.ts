/**
 * Agent Memory CRUD Operations Tests
 *
 * Tests for listing, getting, updating, and deleting agent working memories.
 */

import { FastifyInstance } from "fastify";
import {
    mockAgentRepo,
    mockWorkingMemoryRepo,
    createMockAgent,
    createMockWorkingMemory,
    resetAllMocks,
    createMemoryTestServer,
    closeMemoryTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    uuidv4
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
    ThreadEmbeddingRepository: jest.fn().mockImplementation(() => ({
        searchSimilar: jest.fn(),
        getCountForAgent: jest.fn(),
        deleteByAgent: jest.fn()
    }))
}));

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => ({
        generateEmbeddings: jest.fn()
    }))
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Memory CRUD Operations", () => {
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
});
