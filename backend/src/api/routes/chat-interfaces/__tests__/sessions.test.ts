/**
 * Chat Interface Sessions Route Tests
 *
 * Tests for session listing, get session, and stats endpoints.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP (must be before imports)
// ============================================================================

const mockChatInterfaceRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByAgentIdAndWorkspaceId: jest.fn(),
    isSlugAvailableInWorkspace: jest.fn(),
    create: jest.fn(),
    updateByWorkspaceId: jest.fn(),
    softDeleteByWorkspaceId: jest.fn(),
    publishByWorkspaceId: jest.fn(),
    unpublishByWorkspaceId: jest.fn(),
    duplicateByWorkspaceId: jest.fn()
};

const mockSessionRepo = {
    findByInterfaceId: jest.fn(),
    findById: jest.fn(),
    getSessionStats: jest.fn()
};

jest.mock("../../../../storage/repositories/ChatInterfaceRepository", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/ChatInterfaceSessionRepository", () => ({
    ChatInterfaceSessionRepository: jest.fn().mockImplementation(() => mockSessionRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo),
    ChatInterfaceSessionRepository: jest.fn().mockImplementation(() => mockSessionRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

import {
    authenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import { createMockChatInterface, createMockSession } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
    mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockSessionRepo.findByInterfaceId.mockResolvedValue({ sessions: [], total: 0 });
    mockSessionRepo.findById.mockResolvedValue(null);
    mockSessionRepo.getSessionStats.mockResolvedValue({
        totalSessions: 0,
        activeSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0
    });
}

describe("Chat Interface Sessions Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
        const { chatInterfaceRoutes } = await import("../index");
        await fastify.register(chatInterfaceRoutes);
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // LIST SESSIONS
    // ========================================================================

    describe("GET /chat-interfaces/:id/sessions", () => {
        it("should list sessions for a chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            const sessions = [
                createMockSession({ interfaceId: chatInterface.id }),
                createMockSession({ interfaceId: chatInterface.id })
            ];
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.findByInterfaceId.mockResolvedValue({
                sessions,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/sessions`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: object[];
                total: number;
            }>(response);
            expect(body.data.items).toHaveLength(2);
        });

        it("should return 404 if chat interface not found", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${uuidv4()}/sessions`
            });

            expectErrorResponse(response, 404);
        });

        it("should support pagination", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.findByInterfaceId.mockResolvedValue({ sessions: [], total: 0 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/sessions?limit=10&offset=20`
            });

            expectStatus(response, 200);
            expect(mockSessionRepo.findByInterfaceId).toHaveBeenCalledWith(
                chatInterface.id,
                expect.objectContaining({ limit: 10, offset: 20 })
            );
        });

        it("should filter by status", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.findByInterfaceId.mockResolvedValue({ sessions: [], total: 0 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/sessions?status=active`
            });

            expectStatus(response, 200);
            expect(mockSessionRepo.findByInterfaceId).toHaveBeenCalledWith(
                chatInterface.id,
                expect.objectContaining({ status: "active" })
            );
        });
    });

    // ========================================================================
    // GET SESSION
    // ========================================================================

    describe("GET /chat-interfaces/:id/sessions/:sessionId", () => {
        it("should get a specific session", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            const session = createMockSession({ interfaceId: chatInterface.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.findById.mockResolvedValue(session);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/sessions/${session.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object>(response);
            expect(body.data).toHaveProperty("id", session.id);
        });

        it("should return 404 if chat interface not found", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${uuidv4()}/sessions/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 if session not found", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/sessions/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 if session belongs to different interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            const session = createMockSession({ interfaceId: uuidv4() });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.findById.mockResolvedValue(session);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/sessions/${session.id}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // GET STATS
    // ========================================================================

    describe("GET /chat-interfaces/:id/stats", () => {
        it("should get stats for a chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({
                userId: testUser.id,
                sessionCount: 100,
                messageCount: 500
            });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.getSessionStats.mockResolvedValue({
                totalSessions: 50,
                activeSessions: 10,
                totalMessages: 200,
                avgMessagesPerSession: 4
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/stats`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                totalSessions: number;
                activeSessions: number;
                chatInterface: { sessionCount: number; messageCount: number };
            }>(response);
            expect(body.data.totalSessions).toBe(50);
            expect(body.data.chatInterface.sessionCount).toBe(100);
        });

        it("should return 404 if chat interface not found", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${uuidv4()}/stats`
            });

            expectErrorResponse(response, 404);
        });

        it("should support custom hours parameter", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockSessionRepo.getSessionStats.mockResolvedValue({
                totalSessions: 10,
                activeSessions: 2,
                totalMessages: 50,
                avgMessagesPerSession: 5
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}/stats?hours=48`
            });

            expectStatus(response, 200);
            expect(mockSessionRepo.getSessionStats).toHaveBeenCalledWith(chatInterface.id, 48);
        });
    });
});
