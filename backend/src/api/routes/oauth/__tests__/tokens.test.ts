/**
 * OAuth Token Tests
 *
 * Tests for OAuth token management:
 * - POST /oauth/:provider/refresh/:connectionId - Refresh token
 * - POST /oauth/:provider/revoke/:connectionId - Revoke token
 */

import { FastifyInstance } from "fastify";

import {
    mockOAuthService,
    mockForceRefreshToken,
    mockConnectionRepo,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    createMockConnection,
    createTestUser,
    createAuthToken,
    createOAuthTestServer,
    resetAllMocks,
    setupDefaultWorkspaceMocks
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP - Must be before imports that use these modules
// ============================================================================

jest.mock("../../../../services/auth/DeviceCodeService", () => ({
    deviceCodeService: {
        generateDeviceCode: jest.fn(),
        getDeviceCode: jest.fn(),
        getDeviceCodeByUserCode: jest.fn(),
        authorizeDeviceCode: jest.fn(),
        denyDeviceCode: jest.fn(),
        pollForToken: jest.fn()
    }
}));

jest.mock("../../../../services/oauth/OAuthService", () => ({
    oauthService: mockOAuthService
}));

jest.mock("../../../../services/oauth/TokenRefreshService", () => ({
    forceRefreshToken: mockForceRefreshToken
}));

jest.mock("../../../../services/oauth/OAuthProviderRegistry", () => ({
    listOAuthProviders: jest.fn(),
    OAUTH_PROVIDERS: {
        google: { name: "google", displayName: "Google" },
        slack: { name: "slack", displayName: "Slack" }
    },
    getOAuthProvider: jest.fn((name: string) => {
        const providers: Record<string, unknown> = {
            slack: { name: "slack", clientId: "test-slack-client-id" },
            google: { name: "google", clientId: "test-google-client-id" }
        };
        return providers[name] || null;
    }),
    isOAuthProvider: jest.fn((name: string) => ["slack", "google"].includes(name))
}));

jest.mock("../../../../services/oauth/CredentialRefreshScheduler", () => ({
    credentialRefreshScheduler: {
        start: jest.fn(),
        stop: jest.fn(),
        getStatus: jest.fn().mockReturnValue({
            isRunning: true,
            lastRun: new Date().toISOString(),
            credentialsRefreshed: 5,
            errors: 0
        }),
        forceRefresh: jest.fn().mockResolvedValue(undefined),
        resetCircuitBreaker: jest.fn()
    }
}));

jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByEmailOrGoogleId: jest.fn(),
        findByEmailOrMicrosoftId: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }))
}));

jest.mock("../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceRepository", () => ({
    WorkspaceRepository: jest.fn().mockImplementation(() => mockWorkspaceRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceMemberRepository", () => ({
    WorkspaceMemberRepository: jest.fn().mockImplementation(() => mockWorkspaceMemberRepo)
}));

jest.mock("../../../../core/config", () => ({
    config: {
        jwt: {
            secret: "test-jwt-secret",
            expiresIn: "1h"
        },
        appUrl: "http://localhost:3000",
        redis: {
            host: "localhost",
            port: 6379
        }
    }
}));

jest.mock("../../../../storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            pool: {
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
            }
        })
    },
    pool: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    }
}));

// ============================================================================
// TESTS
// ============================================================================

describe("OAuth Token Management", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createOAuthTestServer();
        await fastify.ready();
    });

    afterAll(async () => {
        await fastify.close();
    });

    beforeEach(() => {
        resetAllMocks();
        setupDefaultWorkspaceMocks();
    });

    // ========================================================================
    // Token Refresh Tests (POST /oauth/:provider/refresh/:connectionId)
    // ========================================================================

    describe("POST /oauth/:provider/refresh/:connectionId", () => {
        it("should refresh token for owned connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "slack",
                connection_method: "oauth2"
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findById.mockResolvedValue(connection);
            mockForceRefreshToken.mockResolvedValue(undefined);

            const updatedConnection = { ...connection, data: { access_token: "new-token" } };
            mockConnectionRepo.findById
                .mockResolvedValueOnce(connection)
                .mockResolvedValueOnce(updatedConnection);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/slack/refresh/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.message).toContain("refreshed");
            expect(mockForceRefreshToken).toHaveBeenCalledWith(connection.id);
        });

        it("should return 403 for non-owned connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({ user_id: "other-user-id" });

            mockConnectionRepo.getOwnerId.mockResolvedValue("other-user-id");

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/slack/refresh/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toContain("permission");
        });

        it("should return 404 for non-existent connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/slack/refresh/nonexistent-id",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for provider mismatch", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "google",
                connection_method: "oauth2"
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findById.mockResolvedValue(connection);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/slack/refresh/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("google");
        });

        it("should return 400 for non-OAuth connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "openai",
                connection_method: "api_key"
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findById.mockResolvedValue(connection);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/openai/refresh/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("not an OAuth");
        });
    });

    // ========================================================================
    // Token Revoke Tests (POST /oauth/:provider/revoke/:connectionId)
    // ========================================================================

    describe("POST /oauth/:provider/revoke/:connectionId", () => {
        it("should revoke token and delete connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "slack",
                connection_method: "oauth2",
                data: { access_token: "token-to-revoke", refresh_token: "refresh" }
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findByIdWithData.mockResolvedValue(connection);
            mockOAuthService.revokeToken.mockResolvedValue(undefined);
            mockConnectionRepo.delete.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/slack/revoke/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.message).toContain("revoked");
            expect(mockOAuthService.revokeToken).toHaveBeenCalledWith("slack", "token-to-revoke");
            expect(mockConnectionRepo.delete).toHaveBeenCalledWith(connection.id);
        });

        it("should delete connection even if provider revocation fails", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "slack",
                connection_method: "oauth2",
                data: { access_token: "token", refresh_token: "refresh" }
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findByIdWithData.mockResolvedValue(connection);
            mockOAuthService.revokeToken.mockRejectedValue(new Error("Provider revocation failed"));
            mockConnectionRepo.delete.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/slack/revoke/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Should still succeed - provider revocation is best effort
            expect(response.statusCode).toBe(200);
            expect(mockConnectionRepo.delete).toHaveBeenCalled();
        });

        it("should return 403 for non-owned connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockConnectionRepo.getOwnerId.mockResolvedValue("other-user-id");

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/slack/revoke/some-connection-id",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(403);
        });

        it("should return 404 for non-existent connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findByIdWithData.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/slack/revoke/nonexistent-id",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for provider mismatch", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "google",
                connection_method: "oauth2"
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findByIdWithData.mockResolvedValue(connection);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/slack/revoke/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 400 for non-OAuth connection", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            const connection = createMockConnection({
                user_id: user.id,
                provider: "openai",
                connection_method: "api_key"
            });

            mockConnectionRepo.getOwnerId.mockResolvedValue(user.id);
            mockConnectionRepo.findByIdWithData.mockResolvedValue(connection);

            const response = await fastify.inject({
                method: "POST",
                url: `/oauth/openai/revoke/${connection.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
        });
    });
});
