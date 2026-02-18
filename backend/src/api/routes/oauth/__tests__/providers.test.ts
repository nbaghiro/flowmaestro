/**
 * OAuth Providers Tests
 *
 * Tests for OAuth provider endpoints:
 * - GET /oauth/providers - List available OAuth providers
 * - GET /oauth/:provider/authorize - Generate authorization URL
 */

import { FastifyInstance } from "fastify";

import {
    mockOAuthService,
    mockListOAuthProviders,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
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
    forceRefreshToken: jest.fn()
}));

jest.mock("../../../../services/oauth/OAuthProviderRegistry", () => ({
    listOAuthProviders: mockListOAuthProviders,
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

describe("OAuth Providers", () => {
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
    // List Providers Tests (GET /oauth/providers)
    // ========================================================================

    describe("GET /oauth/providers", () => {
        it("should list available OAuth providers", async () => {
            const mockProviders = [
                { name: "google", displayName: "Google", configured: true },
                { name: "slack", displayName: "Slack", configured: true },
                { name: "github", displayName: "GitHub", configured: false }
            ];
            mockListOAuthProviders.mockReturnValue(mockProviders);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/providers"
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(3);
            expect(body.data[0].name).toBe("google");
        });

        it("should handle service errors gracefully", async () => {
            mockListOAuthProviders.mockImplementation(() => {
                throw new Error("Registry error");
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/providers"
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
        });
    });

    // ========================================================================
    // Authorize URL Tests (GET /oauth/:provider/authorize)
    // ========================================================================

    describe("GET /oauth/:provider/authorize", () => {
        it("should generate authorization URL for valid provider", async () => {
            const user = createTestUser();
            const workspaceId = "test-workspace-id";
            const token = createAuthToken(fastify, user);
            mockOAuthService.generateAuthUrl.mockReturnValue(
                "https://accounts.google.com/oauth?state=xyz"
            );

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/authorize",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspaceId
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.authUrl).toContain("accounts.google.com");
            expect(body.data.provider).toBe("google");
        });

        it("should pass subdomain option for Zendesk", async () => {
            const user = createTestUser();
            const workspaceId = "test-workspace-id";
            const token = createAuthToken(fastify, user);
            mockOAuthService.generateAuthUrl.mockReturnValue(
                "https://mycompany.zendesk.com/oauth?state=xyz"
            );

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/zendesk/authorize?subdomain=mycompany",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspaceId
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockOAuthService.generateAuthUrl).toHaveBeenCalledWith(
                "zendesk",
                expect.any(String),
                expect.any(String),
                { subdomain: "mycompany" }
            );
        });

        it("should return error for invalid provider", async () => {
            const user = createTestUser();
            const workspaceId = "test-workspace-id";
            const token = createAuthToken(fastify, user);
            mockOAuthService.generateAuthUrl.mockImplementation(() => {
                throw new Error("Unknown provider: invalid");
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/invalid/authorize",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspaceId
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
        });

        it("should require authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/authorize"
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
