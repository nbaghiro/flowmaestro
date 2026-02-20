/**
 * API Key CRUD Operations Tests
 *
 * Tests for listing, getting, creating, and updating API keys.
 */

import { FastifyInstance } from "fastify";
import {
    mockApiKeyRepo,
    createMockApiKey,
    createMockApiKeyWithSecret,
    resetAllMocks,
    createApiKeyTestServer,
    closeApiKeyTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    uuidv4,
    DEFAULT_TEST_WORKSPACE_ID
} from "./helpers/test-utils";
import type { TestUser, MockApiKey } from "./helpers/test-utils";

// ============================================================================
// TESTS
// ============================================================================

describe("API Key CRUD Operations", () => {
    let fastify: FastifyInstance;
    let testUser: TestUser;

    beforeAll(async () => {
        fastify = await createApiKeyTestServer();
    });

    afterAll(async () => {
        await closeApiKeyTestServer(fastify);
    });

    beforeEach(() => {
        testUser = createTestUser();
        resetAllMocks();
    });

    // =========================================================================
    // GET /api-keys - List API Keys
    // =========================================================================
    describe("GET /api-keys", () => {
        it("should list API keys for workspace", async () => {
            const mockKeys = [
                createMockApiKey({ name: "Key 1" }),
                createMockApiKey({ name: "Key 2" })
            ];
            mockApiKeyRepo.findByWorkspaceId.mockResolvedValueOnce({
                keys: mockKeys,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: MockApiKey[];
                pagination: {
                    page: number;
                    per_page: number;
                    total_count: number;
                    total_pages: number;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
            expect(body.pagination.total_count).toBe(2);
            expect(mockApiKeyRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 50, offset: 0, includeRevoked: false })
            );
        });

        it("should return empty array when no API keys exist", async () => {
            mockApiKeyRepo.findByWorkspaceId.mockResolvedValueOnce({
                keys: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: MockApiKey[] }>();
            expect(body.data).toEqual([]);
        });

        it("should support pagination parameters", async () => {
            mockApiKeyRepo.findByWorkspaceId.mockResolvedValueOnce({
                keys: [],
                total: 100
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys?page=2&per_page=10"
            });

            expect(response.statusCode).toBe(200);
            expect(mockApiKeyRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 10, offset: 10 })
            );
        });

        it("should support include_revoked filter", async () => {
            mockApiKeyRepo.findByWorkspaceId.mockResolvedValueOnce({
                keys: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys?include_revoked=true"
            });

            expect(response.statusCode).toBe(200);
            expect(mockApiKeyRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ includeRevoked: true })
            );
        });

        it("should cap per_page at 100", async () => {
            mockApiKeyRepo.findByWorkspaceId.mockResolvedValueOnce({
                keys: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys?per_page=500"
            });

            expect(response.statusCode).toBe(200);
            expect(mockApiKeyRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 100 })
            );
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/api-keys"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /api-keys/scopes - List Available Scopes
    // =========================================================================
    describe("GET /api-keys/scopes", () => {
        it("should list all available scopes and bundles", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys/scopes"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: {
                    scopes: string[];
                    bundles: Array<{ name: string; scopes: string[]; description: string }>;
                };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.scopes).toContain("workflows:read");
            expect(body.data.scopes).toContain("agents:execute");
            expect(body.data.bundles.length).toBeGreaterThan(0);
            expect(body.data.bundles.find((b) => b.name === "full-access")).toBeDefined();
        });

        it("should return bundles with descriptions", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/api-keys/scopes"
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: {
                    bundles: Array<{ name: string; description: string }>;
                };
            }>();
            const workflowExecutor = body.data.bundles.find((b) => b.name === "workflow-executor");
            expect(workflowExecutor).toBeDefined();
            expect(workflowExecutor?.description).toBeTruthy();
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/api-keys/scopes"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // GET /api-keys/:id - Get API Key
    // =========================================================================
    describe("GET /api-keys/:id", () => {
        it("should get an API key by ID", async () => {
            const keyId = uuidv4();
            const mockKey = createMockApiKey({ id: keyId, name: "Production Key" });
            mockApiKeyRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { id: string; name: string } }>();
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(keyId);
            expect(body.data.name).toBe("Production Key");
            expect(mockApiKeyRepo.findByIdAndWorkspaceId).toHaveBeenCalledWith(
                keyId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should return formatted dates in response", async () => {
            const keyId = uuidv4();
            const mockKey = createMockApiKey({
                id: keyId,
                created_at: new Date("2024-01-15T10:00:00Z"),
                last_used_at: new Date("2024-01-20T15:30:00Z")
            });
            mockApiKeyRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(mockKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { created_at: string; last_used_at: string };
            }>();
            expect(body.data.created_at).toContain("2024-01-15");
            expect(body.data.last_used_at).toContain("2024-01-20");
        });

        it("should return 404 when API key not found", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{
                success: boolean;
                error: { code: string; message: string };
            }>();
            expect(body.error.code).toBe("not_found");
        });

        it("should return 404 for other workspace's API key", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.findByIdAndWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 401 for unauthenticated request", async () => {
            const keyId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // POST /api-keys - Create API Key
    // =========================================================================
    describe("POST /api-keys", () => {
        it("should create an API key with explicit scopes", async () => {
            const mockKey = createMockApiKeyWithSecret({
                name: "New Key",
                scopes: ["workflows:read", "executions:read"]
            });
            mockApiKeyRepo.create.mockResolvedValueOnce(mockKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "New Key",
                    scopes: ["workflows:read", "executions:read"]
                }
            });

            expect(response.statusCode).toBe(201);
            const body = response.json<{
                success: boolean;
                data: { id: string; name: string; key: string };
                message: string;
            }>();
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("New Key");
            expect(body.data.key).toBeDefined();
            expect(body.message).toContain("Store this API key securely");
        });

        it("should create an API key with scope bundle", async () => {
            const mockKey = createMockApiKeyWithSecret({
                name: "Bundle Key",
                scopes: [
                    "workflows:read",
                    "workflows:execute",
                    "executions:read",
                    "executions:cancel",
                    "triggers:read",
                    "triggers:execute"
                ]
            });
            mockApiKeyRepo.create.mockResolvedValueOnce(mockKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Bundle Key",
                    bundle: "workflow-executor"
                }
            });

            expect(response.statusCode).toBe(201);
            expect(mockApiKeyRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    scopes: expect.arrayContaining(["workflows:read", "workflows:execute"])
                })
            );
        });

        it("should create an API key with rate limits", async () => {
            const mockKey = createMockApiKeyWithSecret({
                rate_limit_per_minute: 30,
                rate_limit_per_day: 500
            });
            mockApiKeyRepo.create.mockResolvedValueOnce(mockKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Rate Limited Key",
                    scopes: ["workflows:read"],
                    rate_limit_per_minute: 30,
                    rate_limit_per_day: 500
                }
            });

            expect(response.statusCode).toBe(201);
            expect(mockApiKeyRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    rate_limit_per_minute: 30,
                    rate_limit_per_day: 500
                })
            );
        });

        it("should create an API key with expiration", async () => {
            const mockKey = createMockApiKeyWithSecret({
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            mockApiKeyRepo.create.mockResolvedValueOnce(mockKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Expiring Key",
                    scopes: ["workflows:read"],
                    expires_in_days: 30
                }
            });

            expect(response.statusCode).toBe(201);
            expect(mockApiKeyRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    expires_at: expect.any(Date)
                })
            );
        });

        it("should return 400 for missing name", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    scopes: ["workflows:read"]
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("Name is required");
        });

        it("should return 400 for empty name", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "",
                    scopes: ["workflows:read"]
                }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for name exceeding max length", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "a".repeat(101),
                    scopes: ["workflows:read"]
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("100 characters");
        });

        it("should return 400 for missing scopes and bundle", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "No Scopes Key"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("scopes or bundle is required");
        });

        it("should return 400 for invalid scopes", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Invalid Scopes Key",
                    scopes: ["invalid:scope", "also:invalid"]
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("Invalid scopes");
        });

        it("should return 400 for invalid bundle name", async () => {
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Invalid Bundle Key",
                    bundle: "nonexistent-bundle"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("Invalid bundle");
        });

        it("should return 500 when creation fails", async () => {
            mockApiKeyRepo.create.mockRejectedValueOnce(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Failing Key",
                    scopes: ["workflows:read"]
                }
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/api-keys",
                payload: {
                    name: "Test Key",
                    scopes: ["workflows:read"]
                }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // PATCH /api-keys/:id - Update API Key
    // =========================================================================
    describe("PATCH /api-keys/:id", () => {
        it("should update API key name", async () => {
            const keyId = uuidv4();
            const updatedKey = createMockApiKey({ id: keyId, name: "Updated Name" });
            mockApiKeyRepo.updateByWorkspaceId.mockResolvedValueOnce(updatedKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { name: "Updated Name" }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { name: string } }>();
            expect(body.data.name).toBe("Updated Name");
        });

        it("should update API key scopes", async () => {
            const keyId = uuidv4();
            const updatedKey = createMockApiKey({
                id: keyId,
                scopes: ["agents:read", "agents:execute"]
            });
            mockApiKeyRepo.updateByWorkspaceId.mockResolvedValueOnce(updatedKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { scopes: ["agents:read", "agents:execute"] }
            });

            expect(response.statusCode).toBe(200);
            expect(mockApiKeyRepo.updateByWorkspaceId).toHaveBeenCalledWith(
                keyId,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ scopes: ["agents:read", "agents:execute"] })
            );
        });

        it("should update API key rate limits", async () => {
            const keyId = uuidv4();
            const updatedKey = createMockApiKey({
                id: keyId,
                rate_limit_per_minute: 120,
                rate_limit_per_day: 5000
            });
            mockApiKeyRepo.updateByWorkspaceId.mockResolvedValueOnce(updatedKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: {
                    rate_limit_per_minute: 120,
                    rate_limit_per_day: 5000
                }
            });

            expect(response.statusCode).toBe(200);
        });

        it("should update API key active status", async () => {
            const keyId = uuidv4();
            const updatedKey = createMockApiKey({ id: keyId, is_active: false });
            mockApiKeyRepo.updateByWorkspaceId.mockResolvedValueOnce(updatedKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { is_active: false }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{ success: boolean; data: { is_active: boolean } }>();
            expect(body.data.is_active).toBe(false);
        });

        it("should return 400 for empty name", async () => {
            const keyId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { name: "" }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for name exceeding max length", async () => {
            const keyId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { name: "a".repeat(101) }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for empty scopes array", async () => {
            const keyId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { scopes: [] }
            });

            expect(response.statusCode).toBe(400);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("non-empty array");
        });

        it("should return 400 for invalid scopes", async () => {
            const keyId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { scopes: ["invalid:scope"] }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 when API key not found", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.updateByWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 500 when update fails", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.updateByWorkspaceId.mockRejectedValueOnce(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 401 for unauthenticated request", async () => {
            const keyId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "PATCH",
                url: `/api-keys/${keyId}`,
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
