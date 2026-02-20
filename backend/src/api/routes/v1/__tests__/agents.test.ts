/**
 * v1 Agents Route Tests
 *
 * Tests for agent CRUD, threads, and memory endpoints.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    parseResponse,
    mockAgentRepo,
    mockThreadRepo,
    mockWorkingMemoryRepo,
    mockThreadEmbeddingRepo,
    mockEmbeddingService
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
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

describe("v1 Agents Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockApiKey();
    });

    describe("GET /api/v1/agents", () => {
        it("should list agents", async () => {
            mockAgentRepo.findByWorkspaceId.mockResolvedValue({
                agents: [
                    {
                        id: "agent-1",
                        name: "Test Agent",
                        description: "A test agent",
                        model: "gpt-4",
                        provider: "openai",
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                ],
                total: 1
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].name).toBe("Test Agent");
        });
    });

    describe("GET /api/v1/agents/:id", () => {
        it("should get agent by ID", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent",
                description: "A test agent",
                model: "gpt-4",
                provider: "openai",
                system_prompt: "You are helpful",
                temperature: 0.7,
                max_tokens: 1000,
                available_tools: [],
                created_at: new Date(),
                updated_at: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/agent-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.id).toBe("agent-1");
            expect(body.data.system_prompt).toBe("You are helpful");
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/agents/:id/threads", () => {
        it("should create thread for agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockThreadRepo.create.mockResolvedValue({
                id: "thread-1",
                agent_id: "agent-1",
                status: "active",
                created_at: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/agents/agent-1/threads"
            });

            expect(response.statusCode).toBe(201);
            const body = parseResponse(response);
            expect(body.data.id).toBe("thread-1");
            expect(body.data.agent_id).toBe("agent-1");
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/agents/non-existent/threads"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    // =========================================================================
    // AGENT MEMORY ROUTES
    // =========================================================================

    describe("GET /api/v1/agents/:agentId/memory", () => {
        it("should list working memories for an agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue([
                {
                    agentId: "agent-1",
                    userId: "user-1",
                    workingMemory: "User prefers dark mode",
                    metadata: { source: "conversation" },
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    agentId: "agent-1",
                    userId: "user-2",
                    workingMemory: "User speaks Spanish",
                    metadata: {},
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/agent-1/memory"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(2);
            expect(body.data[0].working_memory).toBe("User prefers dark mode");
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/non-existent/memory"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("GET /api/v1/agents/:agentId/memory/:userId", () => {
        it("should get specific user working memory", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockWorkingMemoryRepo.get.mockResolvedValue({
                agentId: "agent-1",
                userId: "user-1",
                workingMemory: "User prefers dark mode",
                metadata: { source: "conversation" },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/agent-1/memory/user-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.working_memory).toBe("User prefers dark mode");
            expect(body.data.user_id).toBe("user-1");
        });

        it("should return 404 for non-existent memory", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockWorkingMemoryRepo.get.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/agent-1/memory/user-1"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("PUT /api/v1/agents/:agentId/memory/:userId", () => {
        it("should update user working memory", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockWorkingMemoryRepo.update.mockResolvedValue({
                agentId: "agent-1",
                userId: "user-1",
                workingMemory: "Updated memory content",
                metadata: { updated: true },
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const response = await apiKeyRequest(fastify, {
                method: "PUT",
                url: "/api/v1/agents/agent-1/memory/user-1",
                payload: {
                    working_memory: "Updated memory content",
                    metadata: { updated: true }
                }
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.working_memory).toBe("Updated memory content");
        });

        it("should return 400 for empty working_memory", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "PUT",
                url: "/api/v1/agents/agent-1/memory/user-1",
                payload: { working_memory: "" }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for missing working_memory", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "PUT",
                url: "/api/v1/agents/agent-1/memory/user-1",
                payload: {}
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("DELETE /api/v1/agents/:agentId/memory/:userId", () => {
        it("should delete user working memory", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockWorkingMemoryRepo.delete.mockResolvedValue(true);

            const response = await apiKeyRequest(fastify, {
                method: "DELETE",
                url: "/api/v1/agents/agent-1/memory/user-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.deleted).toBe(true);
        });

        it("should return 404 for non-existent memory", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockWorkingMemoryRepo.delete.mockResolvedValue(false);

            const response = await apiKeyRequest(fastify, {
                method: "DELETE",
                url: "/api/v1/agents/agent-1/memory/user-1"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/agents/:agentId/memory/search", () => {
        it("should perform semantic search across memories", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]]
            });
            mockThreadEmbeddingRepo.searchSimilar.mockResolvedValue([
                {
                    content: "User mentioned they like Python",
                    message_role: "user",
                    similarity: 0.92,
                    execution_id: "exec-1",
                    context_before: [],
                    context_after: []
                }
            ]);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/agents/agent-1/memory/search",
                payload: { query: "programming preferences", top_k: 5 }
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.results).toHaveLength(1);
            expect(body.data.results[0].similarity).toBe(0.92);
        });

        it("should return 400 for empty query", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/agents/agent-1/memory/search",
                payload: { query: "" }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should handle embedding service errors", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent"
            });
            mockEmbeddingService.generateEmbeddings.mockRejectedValue(
                new Error("Embedding service unavailable")
            );

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/agents/agent-1/memory/search",
                payload: { query: "test" }
            });

            expect(response.statusCode).toBe(500);
        });
    });

    describe("GET /api/v1/agents/:agentId/memory/stats", () => {
        it("should return memory statistics", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent",
                memory_config: { enabled: true }
            });
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue([
                { userId: "user-1" },
                { userId: "user-2" }
            ]);
            mockThreadEmbeddingRepo.getCountForAgent.mockResolvedValue(150);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/agent-1/memory/stats"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.working_memory_count).toBe(2);
            expect(body.data.embedding_count).toBe(150);
        });

        it("should handle embedding count errors gracefully", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "agent-1",
                name: "Test Agent",
                memory_config: { enabled: true }
            });
            mockWorkingMemoryRepo.listByAgent.mockResolvedValue([]);
            mockThreadEmbeddingRepo.getCountForAgent.mockRejectedValue(
                new Error("Table does not exist")
            );

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/agents/agent-1/memory/stats"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.embedding_count).toBe(0);
        });
    });
});
