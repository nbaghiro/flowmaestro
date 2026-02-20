/**
 * API Key Lifecycle Operations Tests
 *
 * Tests for rotating, revoking API keys, and authentication requirements.
 */

import { FastifyInstance } from "fastify";
import {
    mockApiKeyRepo,
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
import type { TestUser } from "./helpers/test-utils";

// ============================================================================
// TESTS
// ============================================================================

describe("API Key Lifecycle Operations", () => {
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
    // POST /api-keys/:id/rotate - Rotate API Key
    // =========================================================================
    describe("POST /api-keys/:id/rotate", () => {
        it("should rotate an API key", async () => {
            const oldKeyId = uuidv4();
            const newKey = createMockApiKeyWithSecret({
                id: uuidv4(),
                name: "Rotated Key"
            });
            mockApiKeyRepo.rotateByWorkspaceId.mockResolvedValueOnce(newKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/api-keys/${oldKeyId}/rotate`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { id: string; key: string };
                message: string;
            }>();
            expect(body.success).toBe(true);
            expect(body.data.key).toBeDefined();
            expect(body.message).toContain("rotated");
            expect(mockApiKeyRepo.rotateByWorkspaceId).toHaveBeenCalledWith(
                oldKeyId,
                DEFAULT_TEST_WORKSPACE_ID,
                testUser.id
            );
        });

        it("should return the new key with all properties", async () => {
            const oldKeyId = uuidv4();
            const newKey = createMockApiKeyWithSecret({
                scopes: ["workflows:read"],
                rate_limit_per_minute: 100
            });
            mockApiKeyRepo.rotateByWorkspaceId.mockResolvedValueOnce(newKey);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/api-keys/${oldKeyId}/rotate`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: {
                    key: string;
                    scopes: string[];
                    rate_limit_per_minute: number;
                };
            }>();
            expect(body.data.scopes).toContain("workflows:read");
            expect(body.data.rate_limit_per_minute).toBe(100);
        });

        it("should return 404 when API key not found", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.rotateByWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/api-keys/${keyId}/rotate`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 404 when API key already revoked", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.rotateByWorkspaceId.mockResolvedValueOnce(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/api-keys/${keyId}/rotate`
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("already revoked");
        });

        it("should return 500 when rotation fails", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.rotateByWorkspaceId.mockRejectedValueOnce(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/api-keys/${keyId}/rotate`
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 401 for unauthenticated request", async () => {
            const keyId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/api-keys/${keyId}/rotate`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // DELETE /api-keys/:id - Revoke API Key
    // =========================================================================
    describe("DELETE /api-keys/:id", () => {
        it("should revoke an API key", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.revokeByWorkspaceId.mockResolvedValueOnce(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(200);
            const body = response.json<{
                success: boolean;
                data: { id: string; revoked: boolean };
            }>();
            expect(body.success).toBe(true);
            expect(body.data.revoked).toBe(true);
            expect(mockApiKeyRepo.revokeByWorkspaceId).toHaveBeenCalledWith(
                keyId,
                DEFAULT_TEST_WORKSPACE_ID
            );
        });

        it("should return 404 when API key not found", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.revokeByWorkspaceId.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 404 when API key already revoked", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.revokeByWorkspaceId.mockResolvedValueOnce(false);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(404);
            const body = response.json<{ success: boolean; error: { message: string } }>();
            expect(body.error.message).toContain("already revoked");
        });

        it("should return 500 when revocation fails", async () => {
            const keyId = uuidv4();
            mockApiKeyRepo.revokeByWorkspaceId.mockRejectedValueOnce(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(500);
        });

        it("should return 401 for unauthenticated request", async () => {
            const keyId = uuidv4();

            const response = await unauthenticatedRequest(fastify, {
                method: "DELETE",
                url: `/api-keys/${keyId}`
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // =========================================================================
    // Authentication Required (parameterized tests)
    // =========================================================================
    describe("Authentication required for all endpoints", () => {
        const keyId = uuidv4();

        const endpoints = [
            { method: "GET" as const, url: "/api-keys" },
            { method: "GET" as const, url: "/api-keys/scopes" },
            { method: "GET" as const, url: `/api-keys/${keyId}` },
            {
                method: "POST" as const,
                url: "/api-keys",
                payload: { name: "Test", scopes: ["workflows:read"] }
            },
            { method: "PATCH" as const, url: `/api-keys/${keyId}`, payload: { name: "Updated" } },
            { method: "POST" as const, url: `/api-keys/${keyId}/rotate` },
            { method: "DELETE" as const, url: `/api-keys/${keyId}` }
        ];

        it.each(endpoints)(
            "$method $url should return 401 without authentication",
            async ({ method, url, payload }) => {
                const response = await unauthenticatedRequest(fastify, {
                    method,
                    url,
                    payload
                });

                expect(response.statusCode).toBe(401);
            }
        );
    });
});
