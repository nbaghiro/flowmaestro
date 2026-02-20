/**
 * Chat Interface Lifecycle Route Tests
 *
 * Tests for publish, unpublish, and duplicate operations.
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

jest.mock("../../../../storage/repositories/ChatInterfaceRepository", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo),
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
import { createMockChatInterface, MockChatInterface } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
    mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockChatInterfaceRepo.publishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(
            createMockChatInterface({ id, status: "published", publishedAt: new Date() })
        )
    );
    mockChatInterfaceRepo.unpublishByWorkspaceId.mockImplementation((id) =>
        Promise.resolve(createMockChatInterface({ id, status: "draft", publishedAt: null }))
    );
    mockChatInterfaceRepo.duplicateByWorkspaceId.mockImplementation(() =>
        Promise.resolve(createMockChatInterface({ status: "draft" }))
    );
}

describe("Chat Interface Lifecycle Routes", () => {
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
    // PUBLISH CHAT INTERFACE
    // ========================================================================

    describe("POST /chat-interfaces/:id/publish", () => {
        it("should publish a draft chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id, status: "draft" });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockChatInterfaceRepo.publishByWorkspaceId.mockResolvedValue({
                ...chatInterface,
                status: "published",
                publishedAt: new Date()
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${chatInterface.id}/publish`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<MockChatInterface>(response);
            expect(body.data.status).toBe("published");
        });

        it("should return success for already published chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({
                userId: testUser.id,
                status: "published",
                publishedAt: new Date()
            });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${chatInterface.id}/publish`
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.publishByWorkspaceId).not.toHaveBeenCalled();
        });

        it("should return 404 for non-existent chat interface", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${uuidv4()}/publish`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // UNPUBLISH CHAT INTERFACE
    // ========================================================================

    describe("POST /chat-interfaces/:id/unpublish", () => {
        it("should unpublish a published chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({
                userId: testUser.id,
                status: "published",
                publishedAt: new Date()
            });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockChatInterfaceRepo.unpublishByWorkspaceId.mockResolvedValue({
                ...chatInterface,
                status: "draft",
                publishedAt: null
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${chatInterface.id}/unpublish`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<MockChatInterface>(response);
            expect(body.data.status).toBe("draft");
        });

        it("should return success for already draft chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({
                userId: testUser.id,
                status: "draft"
            });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${chatInterface.id}/unpublish`
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.unpublishByWorkspaceId).not.toHaveBeenCalled();
        });

        it("should return 404 for non-existent chat interface", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${uuidv4()}/unpublish`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // DUPLICATE CHAT INTERFACE
    // ========================================================================

    describe("POST /chat-interfaces/:id/duplicate", () => {
        it("should duplicate a chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            const duplicated = createMockChatInterface({
                ...chatInterface,
                id: uuidv4(),
                slug: `${chatInterface.slug}-copy`,
                status: "draft"
            });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockChatInterfaceRepo.duplicateByWorkspaceId.mockResolvedValue(duplicated);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${chatInterface.id}/duplicate`
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<MockChatInterface>(response);
            expect(body.data.id).not.toBe(chatInterface.id);
            expect(body.data.status).toBe("draft");
        });

        it("should return 404 for non-existent chat interface", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/chat-interfaces/${uuidv4()}/duplicate`
            });

            expectErrorResponse(response, 404);
        });
    });
});
