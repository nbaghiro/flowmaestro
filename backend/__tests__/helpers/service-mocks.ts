/**
 * Service Mock Factories
 *
 * Provides mock factory functions for common services used in testing.
 */

import type { WorkspaceRole } from "@flowmaestro/shared";
import type { ApiKeyModel, ApiKeyScope } from "../../src/storage/models/ApiKey";

// ============================================================================
// API KEY MOCKS
// ============================================================================

export interface MockApiKeyRepositoryOptions {
    findByHash?: ApiKeyModel | null;
    findById?: ApiKeyModel | null;
    isValid?: boolean;
}

export function createMockApiKeyRepository(options: MockApiKeyRepositoryOptions = {}) {
    return {
        findByHash: jest.fn().mockResolvedValue(options.findByHash ?? null),
        findById: jest.fn().mockResolvedValue(options.findById ?? null),
        findByIdAndUserId: jest.fn().mockResolvedValue(options.findById ?? null),
        findByIdAndWorkspaceId: jest.fn().mockResolvedValue(options.findById ?? null),
        findByWorkspaceId: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((input) =>
            Promise.resolve({
                id: "new-api-key-id",
                ...input,
                created_at: new Date(),
                updated_at: new Date()
            })
        ),
        update: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
        updateLastUsed: jest.fn().mockResolvedValue(undefined),
        revoke: jest.fn().mockResolvedValue(true),
        isValid: jest.fn().mockReturnValue(options.isValid ?? true)
    };
}

// ============================================================================
// WORKSPACE MOCKS
// ============================================================================

export interface MockWorkspace {
    id: string;
    name: string;
    slug: string;
    type: "personal" | "team";
    owner_id: string;
    max_workflows: number;
    max_agents: number;
    max_knowledge_bases: number;
    max_kb_chunks: number;
    max_members: number;
    max_connections: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export function createMockWorkspace(overrides: Partial<MockWorkspace> = {}): MockWorkspace {
    return {
        id: "workspace-123",
        name: "Test Workspace",
        slug: "test-workspace",
        type: "personal",
        owner_id: "user-123",
        max_workflows: 100,
        max_agents: 50,
        max_knowledge_bases: 20,
        max_kb_chunks: 10000,
        max_members: 10,
        max_connections: 50,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
        deleted_at: null,
        ...overrides
    };
}

export interface MockWorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    created_at: Date;
    updated_at: Date;
}

export function createMockWorkspaceMember(
    overrides: Partial<MockWorkspaceMember> = {}
): MockWorkspaceMember {
    return {
        id: "member-123",
        workspace_id: "workspace-123",
        user_id: "user-123",
        role: "owner",
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
        ...overrides
    };
}

export interface MockWorkspaceRepositoryOptions {
    findById?: MockWorkspace | null;
}

export function createMockWorkspaceRepository(options: MockWorkspaceRepositoryOptions = {}) {
    return {
        findById: jest.fn().mockResolvedValue(options.findById ?? null),
        findByOwnerId: jest.fn().mockResolvedValue([]),
        findBySlug: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((input) =>
            Promise.resolve({
                id: "new-workspace-id",
                ...input,
                created_at: new Date(),
                updated_at: new Date()
            })
        ),
        update: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true)
    };
}

export interface MockWorkspaceMemberRepositoryOptions {
    findByWorkspaceAndUser?: MockWorkspaceMember | null;
}

export function createMockWorkspaceMemberRepository(
    options: MockWorkspaceMemberRepositoryOptions = {}
) {
    return {
        findByWorkspaceAndUser: jest.fn().mockResolvedValue(options.findByWorkspaceAndUser ?? null),
        findByWorkspaceId: jest.fn().mockResolvedValue([]),
        findByUserId: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((input) =>
            Promise.resolve({
                id: "new-member-id",
                ...input,
                created_at: new Date(),
                updated_at: new Date()
            })
        ),
        update: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true)
    };
}

// ============================================================================
// CREDIT SERVICE MOCKS
// ============================================================================

export interface MockCreditRepositoryOptions {
    balance?: number;
}

export function createMockWorkspaceCreditRepository(options: MockCreditRepositoryOptions = {}) {
    const balance = options.balance ?? 1000;

    return {
        getBalance: jest.fn().mockResolvedValue(balance),
        reserve: jest.fn().mockResolvedValue(true),
        release: jest.fn().mockResolvedValue(true),
        consume: jest.fn().mockResolvedValue(true),
        addCredits: jest.fn().mockResolvedValue(true),
        getTransactions: jest.fn().mockResolvedValue([]),
        recordTransaction: jest.fn().mockResolvedValue(undefined)
    };
}

// ============================================================================
// CONNECTION MOCKS
// ============================================================================

export interface MockConnection {
    id: string;
    workspace_id: string;
    user_id: string;
    name: string;
    provider: string;
    connection_method: "api_key" | "oauth2" | "basic_auth";
    data: Record<string, unknown>;
    metadata: Record<string, unknown>;
    status: "active" | "expired" | "revoked" | "error";
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export function createMockConnection(overrides: Partial<MockConnection> = {}): MockConnection {
    return {
        id: "connection-123",
        workspace_id: "workspace-123",
        user_id: "user-123",
        name: "Test Connection",
        provider: "openai",
        connection_method: "api_key",
        data: { api_key: "encrypted-key" },
        metadata: {},
        status: "active",
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
        deleted_at: null,
        ...overrides
    };
}

export function createMockConnectionRepository() {
    return {
        findById: jest.fn().mockResolvedValue(null),
        findByWorkspaceId: jest.fn().mockResolvedValue([]),
        findByProvider: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((input) =>
            Promise.resolve({
                id: "new-connection-id",
                ...input,
                created_at: new Date(),
                updated_at: new Date()
            })
        ),
        update: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
        updateStatus: jest.fn().mockResolvedValue(true)
    };
}

// ============================================================================
// OAUTH MOCKS
// ============================================================================

export interface MockOAuthService {
    getAuthorizationUrl: jest.Mock;
    exchangeCodeForTokens: jest.Mock;
    refreshAccessToken: jest.Mock;
    revokeToken: jest.Mock;
}

export function createMockOAuthService(): MockOAuthService {
    return {
        getAuthorizationUrl: jest
            .fn()
            .mockReturnValue("https://oauth.example.com/authorize?state=test"),
        exchangeCodeForTokens: jest.fn().mockResolvedValue({
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            expires_in: 3600,
            token_type: "Bearer"
        }),
        refreshAccessToken: jest.fn().mockResolvedValue({
            access_token: "new-mock-access-token",
            expires_in: 3600
        }),
        revokeToken: jest.fn().mockResolvedValue(undefined)
    };
}

// ============================================================================
// ENCRYPTION SERVICE MOCKS
// ============================================================================

export function createMockEncryptionService() {
    return {
        encrypt: jest.fn().mockImplementation((data: string) => `encrypted:${data}`),
        decrypt: jest.fn().mockImplementation((data: string) => data.replace("encrypted:", "")),
        encryptObject: jest
            .fn()
            .mockImplementation((obj: unknown) => `encrypted:${JSON.stringify(obj)}`),
        decryptObject: jest.fn().mockImplementation((data: string) => {
            const json = data.replace("encrypted:", "");
            return JSON.parse(json);
        }),
        hash: jest.fn().mockImplementation((value: string) => `hash:${value}`),
        generateToken: jest.fn().mockReturnValue("mock-token-12345678901234567890123456789012")
    };
}

// ============================================================================
// AI CLIENT MOCKS
// ============================================================================

export function createMockAIClient() {
    return {
        text: {
            generate: jest.fn().mockResolvedValue({
                text: "Mock AI response",
                usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
            }),
            generateStream: jest.fn().mockReturnValue({
                [Symbol.asyncIterator]: async function* () {
                    yield { text: "Mock ", done: false };
                    yield { text: "streaming ", done: false };
                    yield { text: "response", done: true };
                }
            })
        },
        embedding: {
            generate: jest.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1) }),
            generateBatch: jest.fn().mockResolvedValue([{ embedding: new Array(1536).fill(0.1) }])
        },
        image: {
            generate: jest.fn().mockResolvedValue({ url: "https://example.com/image.png" })
        },
        getApiKey: jest.fn().mockResolvedValue("mock-api-key"),
        isProviderAvailable: jest.fn().mockReturnValue(true),
        getAvailableProviders: jest.fn().mockReturnValue(["openai", "anthropic"])
    };
}

// ============================================================================
// LOGGER MOCKS
// ============================================================================

export function createMockServiceLogger() {
    return {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        child: jest.fn().mockReturnThis()
    };
}

// ============================================================================
// HELPER TO CREATE VALID API KEY STRING
// ============================================================================

export function createTestApiKeyString(): string {
    return "fm_live_" + "a".repeat(56); // Standard format for API keys
}

export function createApiKeyScopes(scopes: ApiKeyScope[]): Set<ApiKeyScope> {
    return new Set(scopes);
}
