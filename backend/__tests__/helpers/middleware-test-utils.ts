/**
 * Middleware Test Utilities
 *
 * Provides mock request/reply objects and assertion helpers for testing
 * Fastify middleware functions in isolation.
 */

import type { WorkspaceRole } from "@flowmaestro/shared";
import type { ApiKeyModel, ApiKeyScope } from "../../src/storage/models/ApiKey";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Workspace context for testing
 */
interface MockWorkspaceContext {
    id: string;
    role: WorkspaceRole;
    isOwner: boolean;
    userId: string;
}

/**
 * Options for creating a mock request
 */
interface MockRequestOptions {
    workspace?: MockWorkspaceContext;
    body?: unknown;
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    ip?: string;
    user?: {
        id: string;
        email?: string;
    };
    /** Set to true to NOT include a default user (user will be undefined) */
    noDefaultUser?: boolean;
    /** API key scopes for scope-checker middleware testing */
    apiKeyScopes?: Set<ApiKeyScope>;
    /** URL for request logging */
    url?: string;
    /** HTTP method for request logging */
    method?: string;
}

/**
 * Tracking object for mock reply assertions
 */
interface ReplyTracking {
    statusCode: number | null;
    sentBody: unknown;
    headers: Record<string, string>;
    sent: boolean;
}

/**
 * Mock reply interface for tracking assertions.
 * Use _tracking to inspect what was sent.
 */
export interface MockReplyTracking {
    _tracking: ReplyTracking;
}

/**
 * Mock reply type that can be passed to middleware (compatible with FastifyReply)
 * and also allows tracking assertions via _tracking property.
 */
export type MockReply = FastifyReply & MockReplyTracking;

/**
 * Create a mock Fastify request for middleware testing
 */
export function createMockRequest(options: MockRequestOptions = {}): FastifyRequest {
    // Determine user value: explicit undefined, provided user, or default
    let user: { id: string; email?: string } | undefined;
    if (options.noDefaultUser || (options.user === undefined && "user" in options)) {
        user = undefined;
    } else if (options.user !== undefined) {
        user = options.user;
    } else {
        user = { id: "test-user-id" };
    }

    const request = {
        workspace: options.workspace,
        body: options.body ?? {},
        query: options.query ?? {},
        params: options.params ?? {},
        headers: options.headers ?? {},
        ip: options.ip ?? "127.0.0.1",
        user,
        id: "test-request-id",
        url: options.url,
        method: options.method,
        apiKeyScopes: options.apiKeyScopes,
        log: {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn()
        },
        // Mock server.jwt for SSE/EventSource token verification
        server: {
            jwt: {
                verify: jest.fn()
            }
        }
    } as unknown as FastifyRequest;

    return request;
}

/**
 * Create a mock workspace context for testing
 */
export function createMockWorkspaceContext(
    options: Partial<MockWorkspaceContext> = {}
): MockWorkspaceContext {
    return {
        id: options.id ?? "test-workspace-id",
        role: options.role ?? "member",
        isOwner: options.isOwner ?? false,
        userId: options.userId ?? "test-user-id"
    };
}

/**
 * Create a mock Fastify reply for middleware testing.
 * Returns a mock that is compatible with FastifyReply for passing to middleware,
 * and also has a _tracking property for assertions.
 */
export function createMockReply(): MockReply {
    const tracking: ReplyTracking = {
        statusCode: null,
        sentBody: undefined,
        headers: {},
        sent: false
    };

    const reply = {
        _tracking: tracking,
        code(statusCode: number) {
            tracking.statusCode = statusCode;
            return reply;
        },
        status(statusCode: number) {
            // Alias for code() - Fastify supports both
            tracking.statusCode = statusCode;
            return reply;
        },
        send(body?: unknown) {
            tracking.sentBody = body;
            tracking.sent = true;
            return reply;
        },
        header(key: string, value: string) {
            tracking.headers[key] = value;
            return reply;
        }
    };

    return reply as unknown as MockReply;
}

/**
 * Assert that an async function throws a specific error
 *
 * @param fn - Async function to execute
 * @param errorName - Expected error name (e.g., "ValidationError", "ForbiddenError")
 * @param messagePattern - Optional regex pattern to match against error message
 */
export async function assertThrowsError(
    fn: () => Promise<unknown>,
    errorName: string,
    messagePattern?: RegExp
): Promise<void> {
    let threw = false;
    let caughtError: Error | undefined;

    try {
        await fn();
    } catch (error) {
        threw = true;
        caughtError = error as Error;
    }

    if (!threw) {
        throw new Error(`Expected function to throw ${errorName}, but it did not throw`);
    }

    if (caughtError!.name !== errorName) {
        throw new Error(
            `Expected error name to be "${errorName}", but got "${caughtError!.name}": ${caughtError!.message}`
        );
    }

    if (messagePattern && !messagePattern.test(caughtError!.message)) {
        throw new Error(
            `Expected error message to match ${messagePattern}, but got: "${caughtError!.message}"`
        );
    }
}

/**
 * Assert that a mock reply was sent with an error response
 *
 * @param reply - Mock reply object
 * @param expectedStatus - Expected HTTP status code
 * @param expectedCode - Optional expected error code in response body
 */
export function assertErrorResponse(
    reply: MockReply,
    expectedStatus: number,
    expectedCode?: string
): void {
    if (!reply._tracking.sent) {
        throw new Error("Expected reply to be sent, but it was not");
    }

    if (reply._tracking.statusCode !== expectedStatus) {
        throw new Error(
            `Expected status code ${expectedStatus}, but got ${reply._tracking.statusCode}`
        );
    }

    if (expectedCode) {
        const body = reply._tracking.sentBody as { error?: { code?: string } };
        if (body?.error?.code !== expectedCode) {
            throw new Error(
                `Expected error code "${expectedCode}", but got "${body?.error?.code}"`
            );
        }
    }
}

/**
 * Assert that a mock reply was NOT sent (middleware passed through)
 *
 * @param reply - Mock reply object
 */
export function assertNoResponse(reply: MockReply): void {
    if (reply._tracking.sent) {
        throw new Error(
            `Expected reply to NOT be sent, but it was sent with status ${reply._tracking.statusCode} and body: ${JSON.stringify(reply._tracking.sentBody)}`
        );
    }
}

/**
 * Create a mock API key for testing
 */
export function createMockApiKey(overrides: Partial<ApiKeyModel> = {}): ApiKeyModel {
    const defaultScopes: ApiKeyScope[] = ["workflows:read", "workflows:execute", "executions:read"];

    return {
        id: "api-key-123",
        user_id: "user-123",
        workspace_id: "workspace-123",
        name: "Test API Key",
        key_prefix: "fm_live_",
        key_hash: "hash_abc123",
        scopes: overrides.scopes ?? defaultScopes,
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
