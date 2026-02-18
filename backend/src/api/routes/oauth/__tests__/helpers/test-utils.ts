/**
 * OAuth Routes Test Utilities
 *
 * Shared mocks and helper functions for OAuth tests.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// SERVICE MOCKS
// ============================================================================

export const mockDeviceCodeService = {
    generateDeviceCode: jest.fn(),
    getDeviceCode: jest.fn(),
    getDeviceCodeByUserCode: jest.fn(),
    authorizeDeviceCode: jest.fn(),
    denyDeviceCode: jest.fn(),
    pollForToken: jest.fn()
};

export const mockOAuthService = {
    generateAuthUrl: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    revokeToken: jest.fn()
};

export const mockForceRefreshToken = jest.fn();

export const mockListOAuthProviders = jest.fn();

export const mockCredentialRefreshScheduler = {
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
};

// ============================================================================
// REPOSITORY MOCKS
// ============================================================================

export const mockUserRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailOrGoogleId: jest.fn(),
    findByEmailOrMicrosoftId: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

export const mockConnectionRepo = {
    findById: jest.fn(),
    findByIdWithData: jest.fn(),
    getOwnerId: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

export const mockWorkspaceRepo = {
    findById: jest.fn()
};

export const mockWorkspaceMemberRepo = {
    findByWorkspaceAndUser: jest.fn()
};

// ============================================================================
// TEST HELPERS
// ============================================================================

export function createMockDbUser(
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

export function createMockConnection(
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

export function createMockWorkspace(id: string, ownerId: string) {
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

export function createMockWorkspaceMember(workspaceId: string, userId: string) {
    return {
        id: uuidv4(),
        workspace_id: workspaceId,
        user_id: userId,
        role: "owner",
        created_at: new Date(),
        updated_at: new Date()
    };
}

export interface TestUser {
    id: string;
    email: string;
    name?: string;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || `test-${Date.now()}@example.com`,
        name: overrides.name || "Test User"
    };
}

export function createAuthToken(fastify: FastifyInstance, user: TestUser): string {
    return fastify.jwt.sign({
        id: user.id,
        email: user.email
    });
}

// ============================================================================
// TEST SERVER SETUP
// ============================================================================

export async function createOAuthTestServer(): Promise<FastifyInstance> {
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
    const { oauthRoutes } = await import("../../index");
    await fastify.register(oauthRoutes, { prefix: "/oauth" });

    return fastify;
}

// ============================================================================
// RESET MOCKS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset service mocks
    mockDeviceCodeService.generateDeviceCode.mockReset();
    mockDeviceCodeService.getDeviceCode.mockReset();
    mockDeviceCodeService.getDeviceCodeByUserCode.mockReset();
    mockDeviceCodeService.authorizeDeviceCode.mockReset();
    mockDeviceCodeService.denyDeviceCode.mockReset();
    mockDeviceCodeService.pollForToken.mockReset();

    mockOAuthService.generateAuthUrl.mockReset();
    mockOAuthService.exchangeCodeForToken.mockReset();
    mockOAuthService.revokeToken.mockReset();

    mockForceRefreshToken.mockReset();
    mockListOAuthProviders.mockReset();

    // Reset repository mocks
    mockUserRepo.findById.mockReset();
    mockUserRepo.findByEmail.mockReset();
    mockUserRepo.findByEmailOrGoogleId.mockReset();
    mockUserRepo.findByEmailOrMicrosoftId.mockReset();
    mockUserRepo.create.mockReset();
    mockUserRepo.update.mockReset();

    mockConnectionRepo.findById.mockReset();
    mockConnectionRepo.findByIdWithData.mockReset();
    mockConnectionRepo.getOwnerId.mockReset();
    mockConnectionRepo.create.mockReset();
    mockConnectionRepo.delete.mockReset();

    mockWorkspaceRepo.findById.mockReset();
    mockWorkspaceMemberRepo.findByWorkspaceAndUser.mockReset();
}

export function setupDefaultWorkspaceMocks(): void {
    mockWorkspaceRepo.findById.mockImplementation((id: string) =>
        Promise.resolve(createMockWorkspace(id, "test-user-id"))
    );
    mockWorkspaceMemberRepo.findByWorkspaceAndUser.mockImplementation(
        (workspaceId: string, userId: string) =>
            Promise.resolve(createMockWorkspaceMember(workspaceId, userId))
    );
}
