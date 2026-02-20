/**
 * v1 Threads Route Tests
 *
 * Tests for thread CRUD and message endpoints.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    parseResponse,
    mockThreadRepo,
    mockAgentExecutionRepo
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
}));

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
}));

describe("v1 Threads Routes", () => {
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

    describe("GET /api/v1/threads/:id", () => {
        it("should get thread by ID", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "thread-1",
                agent_id: "agent-1",
                title: "Test Thread",
                status: "active",
                created_at: new Date(),
                updated_at: new Date(),
                last_message_at: null
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/threads/thread-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.id).toBe("thread-1");
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/threads/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("GET /api/v1/threads/:id/messages", () => {
        it("should get thread messages", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "thread-1"
            });
            mockAgentExecutionRepo.getMessagesByThread.mockResolvedValue([
                {
                    id: "msg-1",
                    role: "user",
                    content: "Hello",
                    tool_calls: null,
                    created_at: new Date()
                },
                {
                    id: "msg-2",
                    role: "assistant",
                    content: "Hi there!",
                    tool_calls: null,
                    created_at: new Date()
                }
            ]);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/threads/thread-1/messages"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.messages).toHaveLength(2);
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/threads/non-existent/messages"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("DELETE /api/v1/threads/:id", () => {
        it("should delete thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "thread-1"
            });
            mockThreadRepo.delete.mockResolvedValue(true);

            const response = await apiKeyRequest(fastify, {
                method: "DELETE",
                url: "/api/v1/threads/thread-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.deleted).toBe(true);
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "DELETE",
                url: "/api/v1/threads/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/threads/:id/messages", () => {
        it("should reject empty message", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/threads/thread-1/messages",
                payload: {}
            });

            expect(response.statusCode).toBe(400);
            const body = parseResponse(response);
            expect(body.error.code).toBe("validation_error");
        });

        it("should return 404 for non-existent thread", async () => {
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/threads/non-existent/messages",
                payload: { content: "Hello" }
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
