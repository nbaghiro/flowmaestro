/**
 * Thread Routes Integration Tests
 *
 * Tests for:
 * - POST /threads - Create thread
 * - GET /threads - List threads
 * - GET /threads/:id - Get thread
 * - GET /threads/:id/messages - Get thread messages
 * - PUT /threads/:id - Update thread
 * - DELETE /threads/:id - Delete thread
 * - POST /threads/:id/archive - Archive thread
 * - POST /threads/:id/unarchive - Unarchive thread
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    TestUser
} from "../../../../../__tests__/helpers/fastify-test-client";

// Mock ThreadRepository
const mockThreadRepo = {
    create: jest.fn(),
    list: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    getStats: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    archive: jest.fn(),
    unarchive: jest.fn()
};

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
}));

// Mock AgentRepository
const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

// Mock AgentExecutionRepository
const mockExecutionRepo = {
    getMessagesByThread: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
}));

// Mock RedisEventBus for streaming
jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: {
        subscribeToThread: jest.fn(),
        unsubscribeFromThread: jest.fn()
    }
}));

// Mock SSE handler
jest.mock("../../../../services/sse", () => ({
    createSSEHandler: jest.fn().mockReturnValue({
        sendEvent: jest.fn(),
        onDisconnect: jest.fn()
    })
}));

describe("Thread Routes", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;
    const testWorkspaceId = "test-workspace-id";

    const mockThread = {
        id: "thread-1",
        user_id: "user-1",
        workspace_id: testWorkspaceId,
        agent_id: "agent-1",
        title: "Test Thread",
        status: "active",
        metadata: {},
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01")
    };

    const mockAgent = {
        id: "agent-1",
        name: "Test Agent",
        workspace_id: testWorkspaceId
    };

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        testUser = createTestUser();
        jest.clearAllMocks();
    });

    // =========================================================================
    // POST /threads - Create Thread
    // =========================================================================
    describe("POST /threads", () => {
        it("should create a thread", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockAgent);
            mockThreadRepo.create.mockResolvedValueOnce(mockThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads",
                payload: {
                    agent_id: "agent-1",
                    title: "New Thread"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { id: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("thread-1");
        });

        it("should create a thread with status and metadata", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockAgent);
            const threadWithMetadata = {
                ...mockThread,
                status: "paused",
                metadata: { key: "value" }
            };
            mockThreadRepo.create.mockResolvedValueOnce(threadWithMetadata);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads",
                payload: {
                    agent_id: "agent-1",
                    title: "Thread with metadata",
                    status: "paused",
                    metadata: { key: "value" }
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{ success: boolean; data: { status: string } }>();
            expect(body.data.status).toBe("paused");
        });

        it("should return 404 when agent not found", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads",
                payload: {
                    agent_id: "non-existent-agent"
                }
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toBe("Agent not found");
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/threads",
                payload: {
                    agent_id: "agent-1"
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /threads - List Threads
    // =========================================================================
    describe("GET /threads", () => {
        it("should list threads", async () => {
            const threads = [mockThread, { ...mockThread, id: "thread-2", title: "Second Thread" }];
            mockThreadRepo.list.mockResolvedValueOnce({
                threads,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { threads: unknown[]; total: number };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.threads).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should filter by agent_id", async () => {
            mockThreadRepo.list.mockResolvedValueOnce({
                threads: [mockThread],
                total: 1
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads?agent_id=agent-1"
            });

            expect(response.statusCode).toBe(200);
            expect(mockThreadRepo.list).toHaveBeenCalledWith(
                expect.objectContaining({
                    agent_id: "agent-1"
                })
            );
        });

        it("should filter by status", async () => {
            mockThreadRepo.list.mockResolvedValueOnce({
                threads: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads?status=archived"
            });

            expect(response.statusCode).toBe(200);
            expect(mockThreadRepo.list).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: "archived"
                })
            );
        });

        it("should support pagination", async () => {
            mockThreadRepo.list.mockResolvedValueOnce({
                threads: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads?limit=10&offset=20"
            });

            expect(response.statusCode).toBe(200);
            expect(mockThreadRepo.list).toHaveBeenCalledWith(
                expect.objectContaining({
                    limit: 10,
                    offset: 20
                })
            );
        });

        it("should support search", async () => {
            mockThreadRepo.list.mockResolvedValueOnce({
                threads: [mockThread],
                total: 1
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads?search=test"
            });

            expect(response.statusCode).toBe(200);
            expect(mockThreadRepo.list).toHaveBeenCalledWith(
                expect.objectContaining({
                    search: "test"
                })
            );
        });

        it("should return empty array when no threads exist", async () => {
            mockThreadRepo.list.mockResolvedValueOnce({
                threads: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { threads: unknown[] } }>();
            expect(body.data.threads).toHaveLength(0);
        });
    });

    // =========================================================================
    // GET /threads/:id - Get Thread
    // =========================================================================
    describe("GET /threads/:id", () => {
        it("should return thread by ID", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads/thread-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { id: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("thread-1");
        });

        it("should include stats when requested", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            mockThreadRepo.getStats.mockResolvedValueOnce({
                messageCount: 10,
                executionCount: 3
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads/thread-1?include_stats=true"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { stats: { messageCount: number } };
            }>();
            expect(body.data.stats).toBeDefined();
            expect(body.data.stats.messageCount).toBe(10);
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/threads/non-existent"
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toBe("Thread not found");
        });
    });

    // =========================================================================
    // GET /threads/:id/messages - Get Thread Messages
    // =========================================================================
    describe("GET /threads/:id/messages", () => {
        const validThreadId = "00000000-0000-0000-0000-000000000001";

        it("should return thread messages", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce({
                ...mockThread,
                id: validThreadId
            });
            const messages = [
                { id: "msg-1", role: "user", content: "Hello", created_at: new Date() },
                { id: "msg-2", role: "assistant", content: "Hi there!", created_at: new Date() }
            ];
            mockExecutionRepo.getMessagesByThread.mockResolvedValueOnce(messages);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/threads/${validThreadId}/messages`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { messages: unknown[] } }>();
            expect(body.data.messages).toHaveLength(2);
        });

        it("should return empty array when no messages", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce({
                ...mockThread,
                id: validThreadId
            });
            mockExecutionRepo.getMessagesByThread.mockResolvedValueOnce([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/threads/${validThreadId}/messages`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { messages: unknown[] } }>();
            expect(body.data.messages).toHaveLength(0);
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/threads/${validThreadId}/messages`
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // PUT /threads/:id - Update Thread
    // =========================================================================
    describe("PUT /threads/:id", () => {
        it("should update thread title", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            const updatedThread = { ...mockThread, title: "Updated Title" };
            mockThreadRepo.update.mockResolvedValueOnce(updatedThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: "/threads/thread-1",
                payload: {
                    title: "Updated Title"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { title: string } }>();
            expect(body.data.title).toBe("Updated Title");
        });

        it("should update thread status", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            const updatedThread = { ...mockThread, status: "completed" };
            mockThreadRepo.update.mockResolvedValueOnce(updatedThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: "/threads/thread-1",
                payload: {
                    status: "completed"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { status: string } }>();
            expect(body.data.status).toBe("completed");
        });

        it("should update thread metadata", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            const updatedThread = { ...mockThread, metadata: { newKey: "newValue" } };
            mockThreadRepo.update.mockResolvedValueOnce(updatedThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: "/threads/thread-1",
                payload: {
                    metadata: { newKey: "newValue" }
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: "/threads/non-existent",
                payload: {
                    title: "New Title"
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // DELETE /threads/:id - Delete Thread
    // =========================================================================
    describe("DELETE /threads/:id", () => {
        it("should delete thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            mockThreadRepo.delete.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/threads/thread-1"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; message: string }>();
            expect(body.success).toBe(true);
            expect(body.message).toContain("deleted");
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/threads/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 500 if delete fails", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            mockThreadRepo.delete.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: "/threads/thread-1"
            });

            expect(response.statusCode).toBe(500);
            const body = response.json<{ success: boolean; error: string }>();
            expect(body.error).toContain("Failed to delete");
        });
    });

    // =========================================================================
    // POST /threads/:id/archive - Archive Thread
    // =========================================================================
    describe("POST /threads/:id/archive", () => {
        it("should archive thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockThread);
            const archivedThread = { ...mockThread, status: "archived" };
            mockThreadRepo.archive.mockResolvedValueOnce(archivedThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads/thread-1/archive",
                payload: {}
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { status: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.status).toBe("archived");
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads/non-existent/archive",
                payload: {}
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // POST /threads/:id/unarchive - Unarchive Thread
    // =========================================================================
    describe("POST /threads/:id/unarchive", () => {
        it("should unarchive thread", async () => {
            const archivedThread = { ...mockThread, status: "archived" };
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(archivedThread);
            const unarchivedThread = { ...mockThread, status: "active" };
            mockThreadRepo.unarchive.mockResolvedValueOnce(unarchivedThread);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads/thread-1/unarchive",
                payload: {}
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { status: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.status).toBe("active");
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/threads/non-existent/unarchive",
                payload: {}
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // GET /threads/:id/stream - Stream Thread (SSE)
    // =========================================================================
    describe("GET /threads/:id/stream", () => {
        const validThreadId = "00000000-0000-0000-0000-000000000001";

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/threads/${validThreadId}/stream`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/threads/${validThreadId}/stream`
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
