/**
 * OAuth Callback Tests
 *
 * Tests for OAuth callback handling:
 * - GET /oauth/:provider/callback - Handle OAuth provider callback
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
    mockOAuthService,
    mockUserRepo,
    mockConnectionRepo,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    createMockDbUser,
    createMockConnection,
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

describe("OAuth Callback", () => {
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
    // OAuth Callback Tests (GET /oauth/:provider/callback)
    // ========================================================================

    describe("GET /oauth/:provider/callback", () => {
        it("should handle OAuth error from provider", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/callback?error=access_denied&error_description=User%20denied%20access"
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Authorization Failed");
            expect(response.payload).toContain("User denied access");
        });

        it("should return error for missing code or state", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/callback?code=auth-code"
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Invalid Request");
            expect(response.payload).toContain("Missing required parameters");
        });

        it("should handle Google authentication flow", async () => {
            const userId = uuidv4();
            mockOAuthService.exchangeCodeForToken.mockResolvedValue({
                userId,
                provider: "google-auth",
                tokens: { access_token: "test-token" },
                accountInfo: {
                    email: "google@example.com",
                    name: "Google User",
                    picture: "https://example.com/avatar.jpg",
                    userId: "google-user-123"
                }
            });

            const mockUser = createMockDbUser({
                email: "google@example.com",
                google_id: "google-user-123"
            });
            mockUserRepo.findByEmailOrGoogleId.mockResolvedValue(mockUser);
            mockUserRepo.update.mockResolvedValue(mockUser);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/callback?code=auth-code&state=state-123"
            });

            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toContain("localhost:3000");
            expect(response.headers.location).toContain("auth_token=");
        });

        it("should create new user on Google auth if not exists", async () => {
            mockOAuthService.exchangeCodeForToken.mockResolvedValue({
                userId: "temp-id",
                provider: "google-auth",
                tokens: { access_token: "test-token" },
                accountInfo: {
                    email: "newuser@example.com",
                    name: "New User",
                    picture: "https://example.com/avatar.jpg",
                    userId: "new-google-user"
                }
            });

            mockUserRepo.findByEmailOrGoogleId.mockResolvedValue(null);
            const newUser = createMockDbUser({
                email: "newuser@example.com",
                google_id: "new-google-user"
            });
            mockUserRepo.create.mockResolvedValue(newUser);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/callback?code=auth-code&state=state-123"
            });

            expect(response.statusCode).toBe(302);
            expect(mockUserRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: "newuser@example.com",
                    google_id: "new-google-user",
                    auth_provider: "google"
                })
            );
        });

        it("should handle Microsoft authentication flow", async () => {
            mockOAuthService.exchangeCodeForToken.mockResolvedValue({
                userId: "temp-id",
                provider: "microsoft-auth",
                tokens: { access_token: "test-token" },
                accountInfo: {
                    email: "msuser@example.com",
                    name: "MS User",
                    picture: null,
                    userId: "ms-user-123"
                }
            });

            const mockUser = createMockDbUser({
                email: "msuser@example.com",
                microsoft_id: "ms-user-123"
            });
            mockUserRepo.findByEmailOrMicrosoftId.mockResolvedValue(mockUser);
            mockUserRepo.update.mockResolvedValue(mockUser);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/microsoft/callback?code=auth-code&state=state-123"
            });

            expect(response.statusCode).toBe(302);
            expect(response.headers.location).toContain("auth_token=");
        });

        it("should handle integration OAuth flow (Slack, etc.)", async () => {
            const userId = uuidv4();
            const workspaceId = uuidv4();
            mockOAuthService.exchangeCodeForToken.mockResolvedValue({
                userId,
                workspaceId,
                provider: "slack",
                tokens: {
                    access_token: "xoxb-token",
                    refresh_token: "xoxr-token",
                    expires_in: 3600,
                    scope: "chat:write channels:read"
                },
                accountInfo: {
                    workspace: "My Slack Workspace",
                    user: "U123456"
                }
            });

            const newConnection = createMockConnection({
                id: uuidv4(),
                user_id: userId,
                workspace_id: workspaceId,
                provider: "slack"
            });
            mockConnectionRepo.create.mockResolvedValue(newConnection);

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/slack/callback?code=slack-auth-code&state=slack-state"
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Connected Successfully");
            expect(mockConnectionRepo.create).toHaveBeenCalled();
        });

        it("should handle callback errors gracefully", async () => {
            mockOAuthService.exchangeCodeForToken.mockRejectedValue(
                new Error("Token exchange failed")
            );

            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/google/callback?code=invalid-code&state=state-123"
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.payload).toContain("Authorization Failed");
            expect(response.payload).toContain("Token exchange failed");
        });
    });
});
