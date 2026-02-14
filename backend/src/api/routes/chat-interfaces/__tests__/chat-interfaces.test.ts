/**
 * Chat Interface Routes Integration Tests
 *
 * Tests for chat interface management endpoints including:
 * - CRUD operations (list, create, get, update, delete)
 * - Publishing lifecycle (publish, unpublish, duplicate)
 * - Sessions listing and stats
 * - Multi-tenant isolation
 * - Pagination
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock chat interface repository
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

// Mock session repository
const mockSessionRepo = {
    findByInterfaceId: jest.fn(),
    findById: jest.fn(),
    getSessionStats: jest.fn()
};

// Mock agent repository
const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

// Mock GCS storage service
const mockGCSService = {
    upload: jest.fn(),
    uploadBuffer: jest.fn(),
    getPublicUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn()
};

jest.mock("../../../../storage/repositories/ChatInterfaceRepository", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/ChatInterfaceSessionRepository", () => ({
    ChatInterfaceSessionRepository: jest.fn().mockImplementation(() => mockSessionRepo)
}));

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo),
    ChatInterfaceSessionRepository: jest.fn().mockImplementation(() => mockSessionRepo),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

jest.mock("../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn().mockImplementation(() => mockGCSService),
    getArtifactsStorageService: jest.fn().mockImplementation(() => mockGCSService)
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

interface MockChatInterface {
    id: string;
    userId: string;
    workspaceId: string;
    name: string;
    slug: string;
    title: string;
    description: string | null;
    agentId: string;
    status: "draft" | "published";
    coverType: "gradient" | "image" | "color";
    coverValue: string;
    iconUrl: string | null;
    primaryColor: string;
    fontFamily: string;
    borderRadius: number;
    welcomeMessage: string;
    placeholderText: string;
    suggestedPrompts: Array<{ text: string; icon?: string }>;
    allowFileUpload: boolean;
    maxFiles: number;
    maxFileSizeMb: number;
    allowedFileTypes: string[];
    persistenceType: "session" | "browser" | "none";
    sessionTimeoutMinutes: number;
    widgetPosition: "bottom-right" | "bottom-left";
    widgetButtonIcon: string;
    widgetButtonText: string | null;
    widgetInitialState: "collapsed" | "expanded";
    rateLimitMessages: number;
    rateLimitWindowSeconds: number;
    sessionCount: number;
    messageCount: number;
    lastActivityAt: Date | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    folderId: string | null;
}

function createMockChatInterface(overrides: Partial<MockChatInterface> = {}): MockChatInterface {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || uuidv4(),
        workspaceId: overrides.workspaceId || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Chat Interface",
        slug: overrides.slug || `test-chat-${Date.now()}`,
        title: overrides.title || "Test Chat",
        description: overrides.description ?? "A test chat interface",
        agentId: overrides.agentId || uuidv4(),
        status: overrides.status || "draft",
        coverType: overrides.coverType || "color",
        coverValue: overrides.coverValue || "#3b82f6",
        iconUrl: overrides.iconUrl ?? null,
        primaryColor: overrides.primaryColor || "#3b82f6",
        fontFamily: overrides.fontFamily || "Inter",
        borderRadius: overrides.borderRadius ?? 8,
        welcomeMessage: overrides.welcomeMessage || "Hello! How can I help you?",
        placeholderText: overrides.placeholderText || "Type your message...",
        suggestedPrompts: overrides.suggestedPrompts || [],
        allowFileUpload: overrides.allowFileUpload ?? true,
        maxFiles: overrides.maxFiles ?? 5,
        maxFileSizeMb: overrides.maxFileSizeMb ?? 10,
        allowedFileTypes: overrides.allowedFileTypes || ["application/pdf"],
        persistenceType: overrides.persistenceType || "session",
        sessionTimeoutMinutes: overrides.sessionTimeoutMinutes ?? 30,
        widgetPosition: overrides.widgetPosition || "bottom-right",
        widgetButtonIcon: overrides.widgetButtonIcon || "chat",
        widgetButtonText: overrides.widgetButtonText ?? null,
        widgetInitialState: overrides.widgetInitialState || "collapsed",
        rateLimitMessages: overrides.rateLimitMessages ?? 10,
        rateLimitWindowSeconds: overrides.rateLimitWindowSeconds ?? 60,
        sessionCount: overrides.sessionCount ?? 0,
        messageCount: overrides.messageCount ?? 0,
        lastActivityAt: overrides.lastActivityAt ?? null,
        publishedAt: overrides.publishedAt ?? null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date(),
        deletedAt: overrides.deletedAt ?? null,
        folderId: overrides.folderId ?? null
    };
}

function createMockSession(
    overrides: Partial<{
        id: string;
        interfaceId: string;
        sessionToken: string;
        threadId: string | null;
        status: string;
        messageCount: number;
        createdAt: Date;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        interfaceId: overrides.interfaceId || uuidv4(),
        sessionToken: overrides.sessionToken || `tok_${uuidv4()}`,
        threadId: overrides.threadId ?? null,
        status: overrides.status || "active",
        messageCount: overrides.messageCount ?? 0,
        firstSeenAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: overrides.createdAt || new Date()
    };
}

function createMockAgent(
    overrides: Partial<{
        id: string;
        name: string;
        workspaceId: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "Test Agent",
        workspaceId: overrides.workspaceId || DEFAULT_TEST_WORKSPACE_ID,
        description: "A test agent",
        model: "gpt-4",
        provider: "openai"
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset default behaviors
    mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({ chatInterfaces: [], total: 0 });
    mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockChatInterfaceRepo.findByAgentIdAndWorkspaceId.mockResolvedValue([]);
    mockChatInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(true);
    mockChatInterfaceRepo.create.mockImplementation((userId, workspaceId, data) =>
        Promise.resolve(createMockChatInterface({ userId, workspaceId, ...data, id: uuidv4() }))
    );
    mockChatInterfaceRepo.updateByWorkspaceId.mockImplementation((id, _workspaceId, data) =>
        Promise.resolve(createMockChatInterface({ id, ...data }))
    );
    mockChatInterfaceRepo.softDeleteByWorkspaceId.mockResolvedValue(true);
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

    mockSessionRepo.findByInterfaceId.mockResolvedValue({ sessions: [], total: 0 });
    mockSessionRepo.findById.mockResolvedValue(null);
    mockSessionRepo.getSessionStats.mockResolvedValue({
        totalSessions: 0,
        activeSessions: 0,
        totalMessages: 0,
        avgMessagesPerSession: 0
    });

    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    mockGCSService.upload.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.uploadBuffer.mockResolvedValue("gs://test-bucket/test-file");
    mockGCSService.getPublicUrl.mockReturnValue(
        "https://storage.googleapis.com/test-bucket/test-file"
    );
    mockGCSService.getSignedDownloadUrl.mockResolvedValue(
        "https://storage.googleapis.com/signed/test-file?token=abc"
    );
}

// ============================================================================
// TESTS
// ============================================================================

describe("Chat Interface Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
        // Register chat interface routes
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
    // LIST CHAT INTERFACES
    // ========================================================================

    describe("GET /chat-interfaces", () => {
        it("should list chat interfaces for authenticated user", async () => {
            const testUser = createTestUser();
            const chatInterfaces = [
                createMockChatInterface({ userId: testUser.id, name: "Chat 1" }),
                createMockChatInterface({ userId: testUser.id, name: "Chat 2" })
            ];
            mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                chatInterfaces,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/chat-interfaces"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: object[];
                total: number;
                page: number;
                pageSize: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.items).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should return empty list for new workspace", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                chatInterfaces: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/chat-interfaces"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ items: object[]; total: number }>(response);
            expect(body.data.items).toHaveLength(0);
            expect(body.data.total).toBe(0);
        });

        it("should filter by agentId", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const chatInterfaces = [createMockChatInterface({ userId: testUser.id, agentId })];
            mockChatInterfaceRepo.findByAgentIdAndWorkspaceId.mockResolvedValue(chatInterfaces);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces?agentId=${agentId}`
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.findByAgentIdAndWorkspaceId).toHaveBeenCalledWith(
                agentId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should support pagination", async () => {
            const testUser = createTestUser();
            const chatInterfaces = [createMockChatInterface({ userId: testUser.id })];
            mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                chatInterfaces,
                total: 50
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/chat-interfaces?limit=10&offset=20"
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 10, offset: 20 })
            );
        });

        it("should filter by folderId null for root level", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                chatInterfaces: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/chat-interfaces?folderId=null"
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ folderId: null })
            );
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/chat-interfaces"
            });

            expectStatus(response, 401);
        });
    });

    // ========================================================================
    // CREATE CHAT INTERFACE
    // ========================================================================

    describe("POST /chat-interfaces", () => {
        it("should create a chat interface", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({ id: agentId });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const createData = {
                name: "My Chat",
                slug: "my-chat",
                title: "My Chat Title",
                agentId
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: createData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<MockChatInterface>(response);
            expect(body.data.name).toBe("My Chat");
            expect(body.data.slug).toBe("my-chat");
            expect(mockChatInterfaceRepo.create).toHaveBeenCalled();
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: { name: "Test" }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing agentId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug: "test-slug",
                    title: "Test Title"
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for invalid slug format", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockAgent({ id: agentId })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug: "A", // Too short, single character
                    title: "Test Title",
                    agentId
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for reserved slug", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockAgent({ id: agentId })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug: "api",
                    title: "Test Title",
                    agentId
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for duplicate slug", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockAgent({ id: agentId })
            );
            mockChatInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug: "existing-slug",
                    title: "Test Title",
                    agentId
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for non-existent agent", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug: "test-chat",
                    title: "Test Title",
                    agentId: uuidv4()
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug: "test-chat",
                    title: "Test Title",
                    agentId: uuidv4()
                }
            });

            expectStatus(response, 401);
        });
    });

    // ========================================================================
    // GET CHAT INTERFACE
    // ========================================================================

    describe("GET /chat-interfaces/:id", () => {
        it("should get a chat interface by id", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${chatInterface.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<MockChatInterface>(response);
            expect(body.data.id).toBe(chatInterface.id);
        });

        it("should return 404 for non-existent chat interface", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should not expose chat interface from different workspace", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // UPDATE CHAT INTERFACE
    // ========================================================================

    describe("PUT /chat-interfaces/:id", () => {
        it("should update a chat interface", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const updateData = { name: "Updated Name", title: "Updated Title" };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/chat-interfaces/${chatInterface.id}`,
                payload: updateData
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.updateByWorkspaceId).toHaveBeenCalledWith(
                chatInterface.id,
                DEFAULT_TEST_WORKSPACE_ID,
                updateData
            );
        });

        it("should return 404 for non-existent chat interface", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/chat-interfaces/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 404);
        });

        it("should validate slug format on update", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/chat-interfaces/${chatInterface.id}`,
                payload: { slug: "X" } // Invalid: single character
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for reserved slug on update", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/chat-interfaces/${chatInterface.id}`,
                payload: { slug: "admin" }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for duplicate slug on update", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);
            mockChatInterfaceRepo.isSlugAvailableInWorkspace.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/chat-interfaces/${chatInterface.id}`,
                payload: { slug: "taken-slug" }
            });

            expectErrorResponse(response, 400);
        });
    });

    // ========================================================================
    // DELETE CHAT INTERFACE
    // ========================================================================

    describe("DELETE /chat-interfaces/:id", () => {
        it("should delete a chat interface", async () => {
            const testUser = createTestUser();
            const chatInterfaceId = uuidv4();
            mockChatInterfaceRepo.softDeleteByWorkspaceId.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/chat-interfaces/${chatInterfaceId}`
            });

            expectStatus(response, 200);
            expect(mockChatInterfaceRepo.softDeleteByWorkspaceId).toHaveBeenCalledWith(
                chatInterfaceId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should return 404 for non-existent chat interface", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.softDeleteByWorkspaceId.mockResolvedValue(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/chat-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
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
            // Should not call publishByWorkspaceId since already published
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
            const session = createMockSession({ interfaceId: uuidv4() }); // Different interface
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

    // ========================================================================
    // MULTI-TENANT ISOLATION
    // ========================================================================

    describe("Multi-tenant isolation", () => {
        it("should not list chat interfaces from different workspace", async () => {
            const testUser = createTestUser();
            mockChatInterfaceRepo.findByWorkspaceId.mockResolvedValue({
                chatInterfaces: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/chat-interfaces"
            });

            expect(mockChatInterfaceRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.anything()
            );
        });

        it("should not allow access to chat interface in different workspace", async () => {
            const testUser = createTestUser();
            // findByIdAndWorkspaceId returns null because it checks workspace
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/chat-interfaces/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // RESERVED SLUGS
    // ========================================================================

    describe("Reserved slugs", () => {
        const reservedSlugs = [
            "api",
            "admin",
            "login",
            "logout",
            "signup",
            "register",
            "settings",
            "dashboard",
            "workflows",
            "agents",
            "c",
            "embed",
            "widget",
            "chat-interfaces",
            "form-interfaces",
            "connections",
            "knowledge-bases",
            "templates"
        ];

        it.each(reservedSlugs)("should reject reserved slug: %s", async (slug) => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockAgent({ id: agentId })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug,
                    title: "Test Title",
                    agentId
                }
            });

            expectErrorResponse(response, 400);
        });
    });

    // ========================================================================
    // SLUG VALIDATION
    // ========================================================================

    describe("Slug validation", () => {
        const invalidSlugs = [
            { slug: "a", reason: "too short (1 char)" },
            { slug: "-test", reason: "starts with hyphen" },
            { slug: "test-", reason: "ends with hyphen" },
            { slug: "TEST", reason: "uppercase letters" },
            { slug: "test_slug", reason: "underscore character" },
            { slug: "test slug", reason: "space character" },
            { slug: "test.slug", reason: "period character" }
        ];

        it.each(invalidSlugs)("should reject invalid slug: $slug ($reason)", async ({ slug }) => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockAgent({ id: agentId })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug,
                    title: "Test Title",
                    agentId
                }
            });

            expectErrorResponse(response, 400);
        });

        const validSlugs = ["ab", "test-chat", "my-chat-interface", "chat123", "123chat", "a1b2c3"];

        it.each(validSlugs)("should accept valid slug: %s", async (slug) => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockAgent({ id: agentId })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/chat-interfaces",
                payload: {
                    name: "Test",
                    slug,
                    title: "Test Title",
                    agentId
                }
            });

            expectStatus(response, 201);
        });
    });
});
