/**
 * OAuth Routes Integration Tests
 *
 * Tests for OAuth endpoints including:
 * - Device Code Flow (RFC 8628)
 * - OAuth Callback Handling
 * - Token Refresh
 * - Token Revocation
 * - Provider Listing
 * - Authorization URL Generation
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP - Must be before imports that use these modules
// ============================================================================

// Mock DeviceCodeService
const mockDeviceCodeService = {
    generateDeviceCode: jest.fn(),
    getDeviceCode: jest.fn(),
    getDeviceCodeByUserCode: jest.fn(),
    authorizeDeviceCode: jest.fn(),
    denyDeviceCode: jest.fn(),
    pollForToken: jest.fn()
};

jest.mock("../../../../services/auth/DeviceCodeService", () => ({
    deviceCodeService: mockDeviceCodeService
}));

// Mock OAuthService
const mockOAuthService = {
    generateAuthUrl: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    revokeToken: jest.fn()
};

jest.mock("../../../../services/oauth/OAuthService", () => ({
    oauthService: mockOAuthService
}));

// Mock TokenRefreshService
const mockForceRefreshToken = jest.fn();
jest.mock("../../../../services/oauth/TokenRefreshService", () => ({
    forceRefreshToken: mockForceRefreshToken
}));

// Mock OAuthProviderRegistry
const mockListOAuthProviders = jest.fn();
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

// Mock CredentialRefreshScheduler
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

// Mock repositories
const mockUserRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailOrGoogleId: jest.fn(),
    findByEmailOrMicrosoftId: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

const mockConnectionRepo = {
    findById: jest.fn(),
    findByIdWithData: jest.fn(),
    getOwnerId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

const mockWorkspaceRepo = {
    findById: jest.fn()
};

const mockWorkspaceMemberRepo = {
    findByWorkspaceAndUser: jest.fn()
};

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

// Mock config
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

// Mock database
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
// TEST HELPERS
// ============================================================================

function createMockDbUser(
    overrides: Partial<{
        id: string;
        email: string;
        name: string;
        google_id: string | null;
        microsoft_id: string | null;
        password_hash: string | null;
        avatar_url: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || "user@example.com",
        name: overrides.name || "Test User",
        google_id: "google_id" in overrides ? overrides.google_id : null,
        microsoft_id: "microsoft_id" in overrides ? overrides.microsoft_id : null,
        password_hash: "password_hash" in overrides ? overrides.password_hash : "hashed_password",
        avatar_url: "avatar_url" in overrides ? overrides.avatar_url : null,
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockConnection(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        provider: string;
        connection_method: string;
        data: Record<string, unknown>;
        status: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || uuidv4(),
        name: overrides.name || "Test Connection",
        provider: overrides.provider || "slack",
        connection_method: overrides.connection_method || "oauth2",
        data: overrides.data || { access_token: "test-token", refresh_token: "test-refresh" },
        status: overrides.status || "active",
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockWorkspace(id: string, ownerId: string) {
    return {
        id,
        name: "Test Workspace",
        slug: "test-workspace",
        type: "personal",
        owner_id: ownerId,
        max_workflows: 100,
        max_agents: 50,
        max_knowledge_bases: 20,
        max_kb_chunks: 10000,
        max_members: 10,
        max_connections: 50,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function createMockWorkspaceMember(workspaceId: string, userId: string) {
    return {
        id: uuidv4(),
        workspace_id: workspaceId,
        user_id: userId,
        role: "owner",
        created_at: new Date(),
        updated_at: new Date()
    };
}

// ============================================================================
// TEST SERVER SETUP WITH OAUTH ROUTES
// ============================================================================

async function createOAuthTestServer(): Promise<FastifyInstance> {
    const Fastify = (await import("fastify")).default;
    const jwt = (await import("@fastify/jwt")).default;
    const cors = (await import("@fastify/cors")).default;

    const fastify = Fastify({ logger: false });

    await fastify.register(cors, {
        origin: true,
        credentials: true
    });

    await fastify.register(jwt, {
        secret: "test-jwt-secret",
        sign: { expiresIn: "1h" }
    });

    // Register OAuth routes
    const { oauthRoutes } = await import("../index");
    await fastify.register(oauthRoutes, { prefix: "/oauth" });

    return fastify;
}

interface TestUser {
    id: string;
    email: string;
    name?: string;
}

function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || `test-${Date.now()}@example.com`,
        name: overrides.name || "Test User"
    };
}

function createAuthToken(fastify: FastifyInstance, user: TestUser): string {
    return fastify.jwt.sign({
        id: user.id,
        email: user.email
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("OAuth Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createOAuthTestServer();
        await fastify.ready();
    });

    afterAll(async () => {
        await fastify.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default workspace mocks
        mockWorkspaceRepo.findById.mockImplementation((id: string) =>
            Promise.resolve(createMockWorkspace(id, "test-user-id"))
        );
        mockWorkspaceMemberRepo.findByWorkspaceAndUser.mockImplementation(
            (workspaceId: string, userId: string) =>
                Promise.resolve(createMockWorkspaceMember(workspaceId, userId))
        );
    });

    // ========================================================================
    // Device Code Flow Tests (POST /oauth/device/code)
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
            const userId = uuidv4();
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
    // Device Verify Tests (GET/POST /oauth/device/verify)
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

    // ========================================================================
    // Scheduler Status Tests (Admin Endpoints)
    // ========================================================================

    describe("Admin Scheduler Endpoints", () => {
        it("GET /oauth/scheduler/status should require authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/oauth/oauth/scheduler/status"
            });

            expect(response.statusCode).toBe(401);
        });

        it("POST /oauth/scheduler/refresh should require authentication", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/oauth/scheduler/refresh"
            });

            expect(response.statusCode).toBe(401);
        });

        it("POST /oauth/scheduler/reset-circuit should require authentication", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/oauth/oauth/scheduler/reset-circuit"
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
