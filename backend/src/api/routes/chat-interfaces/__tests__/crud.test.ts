/**
 * Chat Interface CRUD Route Tests
 *
 * Tests for list, create, get, update, delete operations.
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

const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

jest.mock("../../../../storage/repositories/ChatInterfaceRepository", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo)
}));

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    ChatInterfaceRepository: jest.fn().mockImplementation(() => mockChatInterfaceRepo),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

import {
    authenticatedRequest,
    unauthenticatedRequest,
    createTestServer,
    closeTestServer,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import { createMockChatInterface, createMockAgent, MockChatInterface } from "./setup";

function resetAllMocks(): void {
    jest.clearAllMocks();
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
    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
}

describe("Chat Interface CRUD Routes", () => {
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
                    slug: "A",
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
            expect(mockChatInterfaceRepo.updateByWorkspaceId).toHaveBeenCalled();
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

        it("should return 400 for invalid slug on update", async () => {
            const testUser = createTestUser();
            const chatInterface = createMockChatInterface({ userId: testUser.id });
            mockChatInterfaceRepo.findByIdAndWorkspaceId.mockResolvedValue(chatInterface);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/chat-interfaces/${chatInterface.id}`,
                payload: { slug: "api" }
            });

            expectErrorResponse(response, 400);
        });

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "PUT",
                url: `/chat-interfaces/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectStatus(response, 401);
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

        it("should require authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "DELETE",
                url: `/chat-interfaces/${uuidv4()}`
            });

            expectStatus(response, 401);
        });
    });
});
