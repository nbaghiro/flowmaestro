/**
 * OAuth Device Code Flow Tests
 *
 * Tests for RFC 8628 Device Code Flow endpoints:
 * - POST /oauth/device/code - Generate device code
 * - POST /oauth/device/token - Token polling
 * - GET /oauth/device/verify - Verify device code
 * - POST /oauth/device/verify - Authorize/deny device code
 */

import { FastifyInstance } from "fastify";

import {
    mockDeviceCodeService,
    mockUserRepo,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    createMockDbUser,
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
    deviceCodeService: mockDeviceCodeService
}));

jest.mock("../../../../services/oauth/OAuthService", () => ({
    oauthService: {
        generateAuthUrl: jest.fn(),
        exchangeCodeForToken: jest.fn(),
        revokeToken: jest.fn()
    }
}));

jest.mock("../../../../services/oauth/TokenRefreshService", () => ({
    forceRefreshToken: jest.fn()
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
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByIdWithData: jest.fn(),
        getOwnerId: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
    }))
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

describe("OAuth Device Code Flow", () => {
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
    // Device Code Generation Tests (POST /oauth/device/code)
    // ========================================================================

    describe("POST /oauth/device/code", () => {
        it("should generate device code for valid client", async () => {
            const mockDeviceCode = {
                device_code: "test-device-code-123",
                user_code: "ABCD-1234",
                verification_uri: "http://localhost:3000/device",
                verification_uri_complete: "http://localhost:3000/device?code=ABCD-1234",
                expires_in: 600,
                interval: 5
            };
            mockDeviceCodeService.generateDeviceCode.mockResolvedValue(mockDeviceCode);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/code",
                payload: { client_id: "flowmaestro-cli" }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.device_code).toBe("test-device-code-123");
            expect(body.user_code).toBe("ABCD-1234");
            expect(body.verification_uri).toContain("/device");
            expect(body.expires_in).toBe(600);
            expect(body.interval).toBe(5);
            expect(mockDeviceCodeService.generateDeviceCode).toHaveBeenCalledWith(
                "flowmaestro-cli"
            );
        });

        it("should return error for missing client_id", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/code",
                payload: {}
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("invalid_request");
            expect(body.error_description).toContain("client_id is required");
        });

        it("should return error for unknown client_id", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/code",
                payload: { client_id: "unknown-client" }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("invalid_client");
            expect(body.error_description).toContain("Unknown client_id");
        });

        it("should return server error on service failure", async () => {
            mockDeviceCodeService.generateDeviceCode.mockRejectedValue(new Error("Redis error"));

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/code",
                payload: { client_id: "flowmaestro-cli" }
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("server_error");
        });
    });

    // ========================================================================
    // Device Token Polling Tests (POST /oauth/device/token)
    // ========================================================================

    describe("POST /oauth/device/token", () => {
        const validGrantType = "urn:ietf:params:oauth:grant-type:device_code";

        it("should return access token when authorized", async () => {
            const userId = "test-user-id";
            const mockUser = createMockDbUser({ id: userId, email: "cli@example.com" });

            mockDeviceCodeService.pollForToken.mockResolvedValue({ userId });
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockUserRepo.update.mockResolvedValue(mockUser);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: {
                    device_code: "test-device-code",
                    client_id: "flowmaestro-cli",
                    grant_type: validGrantType
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.access_token).toBeDefined();
            expect(body.refresh_token).toBeDefined();
            expect(body.token_type).toBe("Bearer");
            expect(body.expires_in).toBeGreaterThan(0);
        });

        it("should return authorization_pending while waiting", async () => {
            mockDeviceCodeService.pollForToken.mockResolvedValue({
                error: "authorization_pending"
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: {
                    device_code: "test-device-code",
                    client_id: "flowmaestro-cli",
                    grant_type: validGrantType
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("authorization_pending");
            expect(body.error_description).toContain("pending");
        });

        it("should return expired_token for expired code", async () => {
            mockDeviceCodeService.pollForToken.mockResolvedValue({ error: "expired_token" });

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: {
                    device_code: "expired-device-code",
                    client_id: "flowmaestro-cli",
                    grant_type: validGrantType
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("expired_token");
        });

        it("should return access_denied when user denies", async () => {
            mockDeviceCodeService.pollForToken.mockResolvedValue({ error: "access_denied" });

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: {
                    device_code: "denied-device-code",
                    client_id: "flowmaestro-cli",
                    grant_type: validGrantType
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("access_denied");
        });

        it("should return error for missing parameters", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: { grant_type: validGrantType }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("invalid_request");
        });

        it("should return error for wrong grant_type", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: {
                    device_code: "test-device-code",
                    client_id: "flowmaestro-cli",
                    grant_type: "authorization_code"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("unsupported_grant_type");
        });

        it("should return error if user not found after authorization", async () => {
            mockDeviceCodeService.pollForToken.mockResolvedValue({ userId: "nonexistent-user" });
            mockUserRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/token",
                payload: {
                    device_code: "test-device-code",
                    client_id: "flowmaestro-cli",
                    grant_type: validGrantType
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe("invalid_request");
            expect(body.error_description).toContain("User not found");
        });
    });

    // ========================================================================
    // Device Verify Tests (GET /oauth/device/verify)
    // ========================================================================

    describe("GET /oauth/device/verify", () => {
        it("should return user info for authenticated JSON request without code", async () => {
            const user = createTestUser({ email: "verify@example.com" });
            const token = createAuthToken(fastify, user);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/device/verify",
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.user.email).toBe(user.email);
        });

        it("should return code info for authenticated request with valid code", async () => {
            const user = createTestUser({ email: "verify@example.com" });
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.getDeviceCodeByUserCode.mockResolvedValue({
                deviceCode: "test-device-code",
                userCode: "ABCD-1234",
                clientId: "flowmaestro-cli",
                authorized: false
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/device/verify?user_code=ABCD-1234",
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.user_code).toBe("ABCD-1234");
        });

        it("should return 404 for invalid user code", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.getDeviceCodeByUserCode.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/device/verify?user_code=INVALID",
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toContain("Invalid or expired");
        });

        it("should return HTML for browser requests", async () => {
            const user = createTestUser({ email: "browser@example.com" });
            const token = createAuthToken(fastify, user);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/device/verify",
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "text/html"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Authorize CLI Access");
            expect(response.payload).toContain(user.email);
        });

        it("should require authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/device/verify"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // ========================================================================
    // Device Verify POST Tests (POST /oauth/device/verify)
    // ========================================================================

    describe("POST /oauth/device/verify", () => {
        it("should authorize device code successfully", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.authorizeDeviceCode.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "ABCD-1234", action: "authorize" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.message).toContain("authorized");
            expect(mockDeviceCodeService.authorizeDeviceCode).toHaveBeenCalledWith(
                "ABCD-1234",
                user.id
            );
        });

        it("should deny device code successfully", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.denyDeviceCode.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "ABCD-1234", action: "deny" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.message).toContain("denied");
        });

        it("should return error for invalid code during authorization", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.authorizeDeviceCode.mockResolvedValue(false);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "INVALID", action: "authorize" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toContain("Invalid or expired");
        });

        it("should return error for missing parameters", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "ABCD-1234" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toContain("required");
        });

        it("should return error for invalid action", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "ABCD-1234", action: "invalid" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "application/json"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toContain("authorize");
        });

        it("should return HTML success page for browser authorize", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.authorizeDeviceCode.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "ABCD-1234", action: "authorize" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "text/html"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Device Authorized");
        });

        it("should return HTML denied page for browser deny", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);
            mockDeviceCodeService.denyDeviceCode.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/device/verify",
                payload: { user_code: "ABCD-1234", action: "deny" },
                headers: {
                    Authorization: `Bearer ${token}`,
                    accept: "text/html"
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Authorization Denied");
        });
    });
});
