/**
 * Connection Routes Integration Tests
 *
 * Tests for connection management endpoints including:
 * - CRUD operations
 * - Different connection methods (api_key, oauth2, basic_auth)
 * - Filtering and pagination
 * - Multi-tenant isolation
 * - Security (sensitive data handling)
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock connection repository
const mockConnectionRepo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    getOwnerId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../src/storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

jest.mock("../../../src/storage/repositories", () => ({
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    })),
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    createTestConnectionConfig,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockConnection(
    overrides: Partial<{
        id: string;
        user_id: string;
        name: string;
        provider: string;
        connection_method: string;
        status: string;
        data: object;
        metadata: object;
        capabilities: object;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        name: overrides.name || "Test Connection",
        provider: overrides.provider || "openai",
        connection_method: overrides.connection_method || "api_key",
        status: overrides.status || "active",
        data: overrides.data || { api_key: "sk-***masked***" },
        metadata: overrides.metadata || {},
        capabilities: overrides.capabilities || {},
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset default behaviors
    mockConnectionRepo.findByUserId.mockResolvedValue({ connections: [], total: 0 });
    mockConnectionRepo.findById.mockResolvedValue(null);
    mockConnectionRepo.getOwnerId.mockResolvedValue(null);
    mockConnectionRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockConnection({ ...data, id: uuidv4() }))
    );
    mockConnectionRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockConnection({ id, ...data }))
    );
    mockConnectionRepo.delete.mockResolvedValue(true);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Connection Routes", () => {
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
    // LIST CONNECTIONS
    // ========================================================================

    describe("GET /connections", () => {
        it("should list connections for authenticated user", async () => {
            const testUser = createTestUser();
            const connections = [
                createMockConnection({ user_id: testUser.id, name: "Connection 1" }),
                createMockConnection({ user_id: testUser.id, name: "Connection 2" })
            ];
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(2);
        });

        it("should return empty list for new user", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(0);
        });

        it("should filter by provider", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections",
                query: { provider: "openai" }
            });

            expect(mockConnectionRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                expect.objectContaining({ provider: "openai" })
            );
        });

        it("should filter by connection_method", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections",
                query: { connection_method: "oauth2" }
            });

            expect(mockConnectionRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                expect.objectContaining({ connection_method: "oauth2" })
            );
        });

        it("should filter by status", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections",
                query: { status: "active" }
            });

            expect(mockConnectionRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                expect.objectContaining({ status: "active" })
            );
        });

        it("should respect limit and offset", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections",
                query: { limit: "10", offset: "5" }
            });

            expect(mockConnectionRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                expect.objectContaining({ limit: 10, offset: 5 })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/connections"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // CREATE CONNECTION
    // ========================================================================

    describe("POST /connections", () => {
        it("should create API key connection", async () => {
            const testUser = createTestUser();
            const connectionData = createTestConnectionConfig("openai", "api_key");

            const createdConnection = createMockConnection({
                user_id: testUser.id,
                ...connectionData
            });
            mockConnectionRepo.create.mockResolvedValue(createdConnection);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: connectionData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; provider: string }>(response);
            expect(body.data.provider).toBe("openai");
        });

        it("should create OAuth2 connection", async () => {
            const testUser = createTestUser();
            const connectionData = createTestConnectionConfig("google", "oauth2");

            const createdConnection = createMockConnection({
                user_id: testUser.id,
                connection_method: "oauth2",
                provider: "google"
            });
            mockConnectionRepo.create.mockResolvedValue(createdConnection);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: connectionData
            });

            expectStatus(response, 201);
        });

        it("should create basic auth connection", async () => {
            const testUser = createTestUser();
            const connectionData = createTestConnectionConfig("jira", "basic_auth");

            const createdConnection = createMockConnection({
                user_id: testUser.id,
                connection_method: "basic_auth",
                provider: "jira"
            });
            mockConnectionRepo.create.mockResolvedValue(createdConnection);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: connectionData
            });

            expectStatus(response, 201);
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: {
                    // Missing name, connection_method, provider, data
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for invalid connection_method", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: {
                    name: "Test",
                    connection_method: "invalid_method",
                    provider: "openai",
                    data: { api_key: "test" }
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/connections",
                payload: createTestConnectionConfig()
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET CONNECTION BY ID
    // ========================================================================

    describe("GET /connections/:id", () => {
        it("should return connection for owner", async () => {
            const testUser = createTestUser();
            const connection = createMockConnection({
                id: uuidv4(),
                user_id: testUser.id,
                name: "My Connection"
            });
            mockConnectionRepo.findById.mockResolvedValue(connection);
            mockConnectionRepo.getOwnerId.mockResolvedValue(testUser.id);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/connections/${connection.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("My Connection");
        });

        it("should return 404 for non-existent connection", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/connections/${uuidv4()}`
            });

            expectStatus(response, 404);
        });

        it("should return 403 for other user's connection", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const connection = createMockConnection({
                id: uuidv4(),
                user_id: otherUserId
            });
            mockConnectionRepo.findById.mockResolvedValue(connection);
            mockConnectionRepo.getOwnerId.mockResolvedValue(otherUserId);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/connections/${connection.id}`
            });

            expectStatus(response, 403);
        });

        it("should return 400 for invalid UUID format", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections/not-a-uuid"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // UPDATE CONNECTION
    // ========================================================================

    describe("PUT /connections/:id", () => {
        it("should update connection for owner", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();
            const existingConnection = createMockConnection({
                id: connectionId,
                user_id: testUser.id,
                name: "Old Name"
            });
            mockConnectionRepo.findById.mockResolvedValue(existingConnection);
            mockConnectionRepo.getOwnerId.mockResolvedValue(testUser.id);
            mockConnectionRepo.update.mockResolvedValue({
                ...existingConnection,
                name: "New Name"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/connections/${connectionId}`,
                payload: { name: "New Name" }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("New Name");
        });

        it("should update connection status", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();
            const existingConnection = createMockConnection({
                id: connectionId,
                user_id: testUser.id,
                status: "active"
            });
            mockConnectionRepo.findById.mockResolvedValue(existingConnection);
            mockConnectionRepo.getOwnerId.mockResolvedValue(testUser.id);
            mockConnectionRepo.update.mockResolvedValue({
                ...existingConnection,
                status: "invalid"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/connections/${connectionId}`,
                payload: { status: "invalid" }
            });

            expectStatus(response, 200);
        });

        it("should return 404 for non-existent connection", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/connections/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectStatus(response, 404);
        });
    });

    // ========================================================================
    // DELETE CONNECTION
    // ========================================================================

    describe("DELETE /connections/:id", () => {
        it("should delete connection for owner", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();
            const connection = createMockConnection({
                id: connectionId,
                user_id: testUser.id
            });
            mockConnectionRepo.findById.mockResolvedValue(connection);
            mockConnectionRepo.getOwnerId.mockResolvedValue(testUser.id);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/connections/${connectionId}`
            });

            expectStatus(response, 200);
            expect(mockConnectionRepo.delete).toHaveBeenCalledWith(connectionId);
        });

        it("should return 404 for non-existent connection", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/connections/${uuidv4()}`
            });

            expectStatus(response, 404);
        });

        it("should return 403 for other user's connection", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const connectionId = uuidv4();
            const connection = createMockConnection({
                id: connectionId,
                user_id: otherUserId
            });
            mockConnectionRepo.findById.mockResolvedValue(connection);
            mockConnectionRepo.getOwnerId.mockResolvedValue(otherUserId);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/connections/${connectionId}`
            });

            expectStatus(response, 403);
        });
    });

    // ========================================================================
    // SECURITY TESTS
    // ========================================================================

    describe("Security", () => {
        it("connections are filtered by authenticated user ID", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.findByUserId.mockResolvedValue({
                connections: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/connections"
            });

            expect(mockConnectionRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                expect.any(Object)
            );
        });

        it("connections created are assigned to authenticated user", async () => {
            const testUser = createTestUser();
            mockConnectionRepo.create.mockImplementation((data) =>
                Promise.resolve(createMockConnection(data))
            );

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: createTestConnectionConfig()
            });

            expect(mockConnectionRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ user_id: testUser.id })
            );
        });
    });

    // ========================================================================
    // EDGE CASES
    // ========================================================================

    describe("Edge Cases", () => {
        it("should handle connection with all optional fields", async () => {
            const testUser = createTestUser();
            const minimalConnection = {
                name: "Minimal",
                connection_method: "api_key",
                provider: "custom",
                data: { api_key: "key123" }
            };

            mockConnectionRepo.create.mockResolvedValue(
                createMockConnection({ user_id: testUser.id, ...minimalConnection })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: minimalConnection
            });

            expectStatus(response, 201);
        });

        it("should handle connection with metadata", async () => {
            const testUser = createTestUser();
            const connectionWithMetadata = {
                name: "Connection with Metadata",
                connection_method: "oauth2",
                provider: "google",
                data: {
                    access_token: "token123",
                    token_type: "Bearer"
                },
                metadata: {
                    scopes: ["email", "profile"],
                    account_info: {
                        email: "user@example.com"
                    }
                }
            };

            mockConnectionRepo.create.mockResolvedValue(
                createMockConnection({ user_id: testUser.id, ...connectionWithMetadata })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: connectionWithMetadata
            });

            expectStatus(response, 201);
        });

        it("should handle connection with capabilities", async () => {
            const testUser = createTestUser();
            const connectionWithCaps = {
                name: "Connection with Capabilities",
                connection_method: "api_key",
                provider: "openai",
                data: { api_key: "key123" },
                capabilities: {
                    permissions: ["read", "write"],
                    operations: ["chat", "embeddings"],
                    rate_limit: {
                        requests_per_second: 10,
                        requests_per_day: 10000
                    }
                }
            };

            mockConnectionRepo.create.mockResolvedValue(
                createMockConnection({ user_id: testUser.id, ...connectionWithCaps })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/connections",
                payload: connectionWithCaps
            });

            expectStatus(response, 201);
        });
    });
});
