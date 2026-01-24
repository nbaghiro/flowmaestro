/**
 * Middleware Test Utilities
 *
 * Provides mock Fastify request/reply objects for unit testing middleware.
 */

import type { WorkspaceContext } from "@flowmaestro/shared";
import type { ApiKeyModel, ApiKeyScope } from "../../src/storage/models/ApiKey";
import type { FastifyRequest, FastifyReply } from "fastify";

// ============================================================================
// TYPES
// ============================================================================

export interface MockRequestOptions {
    method?: string;
    url?: string;
    headers?: Record<string, string | string[] | undefined>;
    params?: Record<string, string>;
    query?: Record<string, string | string[] | undefined>;
    body?: unknown;
    ip?: string;
    user?: { id: string; email: string };
    workspace?: WorkspaceContext;
    apiKey?: ApiKeyModel;
    apiKeyScopes?: Set<ApiKeyScope>;
    apiKeyUserId?: string;
    apiKeyWorkspaceId?: string;
}

export interface MockReplyCallTracking {
    statusCode: number | null;
    sentBody: unknown;
    headers: Record<string, string>;
    sent: boolean;
}

// ============================================================================
// MOCK LOGGER
// ============================================================================

export function createMockLogger() {
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
// MOCK REQUEST
// ============================================================================

/**
 * Create a mock Fastify request for testing middleware.
 * Returns a request object with common properties and methods mocked.
 */
export function createMockRequest(options: MockRequestOptions = {}): FastifyRequest {
    const mockLog = createMockLogger();

    const request = {
        method: options.method || "GET",
        url: options.url || "/test",
        headers: options.headers || {},
        params: options.params || {},
        query: options.query || {},
        body: options.body,
        ip: options.ip || "127.0.0.1",
        user: options.user,
        workspace: options.workspace,
        apiKey: options.apiKey,
        apiKeyScopes: options.apiKeyScopes,
        apiKeyUserId: options.apiKeyUserId,
        apiKeyWorkspaceId: options.apiKeyWorkspaceId,
        log: mockLog,
        // JWT verification method - can be overridden in tests
        jwtVerify: jest.fn().mockResolvedValue(undefined),
        server: {
            jwt: {
                verify: jest.fn().mockImplementation(() => {
                    // Default mock returns decoded user
                    return { id: "user-123", email: "test@example.com" };
                }),
                sign: jest.fn().mockReturnValue("mock-jwt-token")
            }
        }
    } as unknown as FastifyRequest;

    return request;
}

// ============================================================================
// MOCK REPLY
// ============================================================================

/**
 * Create a mock Fastify reply for testing middleware.
 * Tracks status codes, sent bodies, and headers for assertions.
 */
export function createMockReply(): FastifyReply & { _tracking: MockReplyCallTracking } {
    const tracking: MockReplyCallTracking = {
        statusCode: null,
        sentBody: undefined,
        headers: {},
        sent: false
    };

    const reply = {
        _tracking: tracking,

        status: jest.fn().mockImplementation((code: number) => {
            tracking.statusCode = code;
            return reply;
        }),

        code: jest.fn().mockImplementation((code: number) => {
            tracking.statusCode = code;
            return reply;
        }),

        send: jest.fn().mockImplementation((body: unknown) => {
            tracking.sentBody = body;
            tracking.sent = true;
            return reply;
        }),

        header: jest.fn().mockImplementation((key: string, value: string) => {
            tracking.headers[key] = value;
            return reply;
        }),

        headers: jest.fn().mockImplementation((headers: Record<string, string>) => {
            Object.assign(tracking.headers, headers);
            return reply;
        }),

        getHeader: jest.fn().mockImplementation((key: string) => {
            return tracking.headers[key];
        }),

        removeHeader: jest.fn().mockImplementation((key: string) => {
            delete tracking.headers[key];
            return reply;
        }),

        type: jest.fn().mockReturnThis(),
        serialize: jest.fn().mockImplementation((data: unknown) => JSON.stringify(data)),
        raw: {},
        request: {},
        server: {}
    } as unknown as FastifyReply & { _tracking: MockReplyCallTracking };

    return reply;
}

// ============================================================================
// MOCK API KEY
// ============================================================================

export function createMockApiKey(overrides: Partial<ApiKeyModel> = {}): ApiKeyModel {
    return {
        id: "api-key-123",
        user_id: "user-123",
        workspace_id: "workspace-123",
        name: "Test API Key",
        key_prefix: "fm_live_",
        key_hash: "hash-abc123",
        scopes: ["workflows:read", "workflows:execute"],
        rate_limit_per_minute: 60,
        rate_limit_per_day: 10000,
        expires_at: null,
        last_used_at: null,
        last_used_ip: null,
        is_active: true,
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-01-01"),
        revoked_at: null,
        ...overrides
    };
}

// ============================================================================
// MOCK WORKSPACE CONTEXT
// ============================================================================

export function createMockWorkspaceContext(
    overrides: Partial<WorkspaceContext> = {}
): WorkspaceContext {
    return {
        id: "workspace-123",
        type: "free",
        role: "owner",
        isOwner: true,
        limits: {
            maxWorkflows: 100,
            maxAgents: 50,
            maxKnowledgeBases: 20,
            maxKbChunks: 10000,
            maxMembers: 10,
            maxConnections: 50
        },
        ...overrides
    };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a middleware returned an error response.
 */
export function assertErrorResponse(
    reply: FastifyReply & { _tracking: MockReplyCallTracking },
    expectedStatus: number,
    expectedErrorCode?: string
): void {
    expect(reply._tracking.sent).toBe(true);
    expect(reply._tracking.statusCode).toBe(expectedStatus);

    if (expectedErrorCode && reply._tracking.sentBody) {
        const body = reply._tracking.sentBody as { error?: { code?: string } };
        expect(body.error?.code).toBe(expectedErrorCode);
    }
}

/**
 * Assert that a middleware did not send a response (passed through).
 */
export function assertNoResponse(reply: FastifyReply & { _tracking: MockReplyCallTracking }): void {
    expect(reply._tracking.sent).toBe(false);
}

/**
 * Assert that a middleware threw an expected error.
 */
export async function assertThrowsError(
    middleware: () => Promise<void>,
    expectedErrorName: string,
    expectedMessage?: string | RegExp
): Promise<void> {
    await expect(middleware()).rejects.toMatchObject({
        name: expectedErrorName,
        ...(expectedMessage ? { message: expect.stringMatching(expectedMessage) } : {})
    });
}
