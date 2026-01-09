/**
 * Fastify Test Client Helper
 *
 * Provides utilities for integration testing of API routes.
 * Creates a test server instance with mocked external dependencies.
 */

import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify, { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    name?: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
}

export interface TestServerOptions {
    /** Skip route registration (for unit testing middleware) */
    skipRoutes?: boolean;
    /** Custom JWT secret */
    jwtSecret?: string;
    /** Custom JWT expiry */
    jwtExpiresIn?: string;
}

export interface InjectOptions {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    payload?: Record<string, unknown>;
    headers?: Record<string, string>;
    query?: Record<string, string>;
}

export interface InjectResponse {
    statusCode: number;
    headers: Record<string, string>;
    payload: string;
    json: <T = Record<string, unknown>>() => T;
}

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock TwilioService to avoid real Twilio client initialization
jest.mock("../../src/services/TwilioService", () => ({
    sendSms: jest.fn().mockResolvedValue({ sid: "test-sms-sid" })
}));

// Mock rate limiter to avoid Redis client initialization
jest.mock("../../src/core/utils/rate-limiter", () => ({
    rateLimiter: {
        isRateLimited: jest.fn().mockResolvedValue(false),
        getResetTime: jest.fn().mockResolvedValue(new Date(Date.now() + 3600000))
    }
}));

// Mock config module for error handler and other services
jest.mock("../../src/core/config", () => ({
    config: {
        env: "test",
        jwt: {
            secret: "test-jwt-secret",
            expiresIn: "1h"
        },
        database: {
            host: "localhost",
            port: 5432,
            database: "test"
        },
        redis: {
            host: "localhost",
            port: 6379
        },
        rateLimit: {
            passwordReset: { maxRequests: 3, windowMinutes: 60 },
            emailVerification: { maxRequests: 5, windowMinutes: 60 }
        }
    }
}));

// Mock EncryptionService to avoid config dependencies at module load time
jest.mock("../../src/services/EncryptionService", () => ({
    EncryptionService: jest.fn().mockImplementation(() => ({
        encrypt: jest.fn((data: string) => `encrypted:${data}`),
        decrypt: jest.fn((data: string) => data.replace("encrypted:", ""))
    })),
    getEncryptionService: jest.fn().mockReturnValue({
        encrypt: jest.fn((data: string) => `encrypted:${data}`),
        decrypt: jest.fn((data: string) => data.replace("encrypted:", ""))
    })
}));

// Mock database to avoid config dependencies at module load time
jest.mock("../../src/storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            pool: {
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                connect: jest.fn().mockResolvedValue({
                    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
                    release: jest.fn()
                }),
                end: jest.fn().mockResolvedValue(undefined)
            },
            close: jest.fn().mockResolvedValue(undefined)
        })
    },
    pool: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
            release: jest.fn()
        }),
        end: jest.fn().mockResolvedValue(undefined)
    }
}));

// Mock external services before importing routes
jest.mock("../../src/services/events/RedisEventBus", () => ({
    redisEventBus: {
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        publish: jest.fn().mockResolvedValue(undefined),
        subscribe: jest.fn().mockResolvedValue(undefined)
    }
}));

jest.mock("../../src/services/websocket/EventBridge", () => ({
    eventBridge: {
        initialize: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined)
    }
}));

jest.mock("../../src/services/oauth/CredentialRefreshScheduler", () => ({
    credentialRefreshScheduler: {
        start: jest.fn(),
        stop: jest.fn()
    }
}));

jest.mock("../../src/services/webhooks", () => ({
    webhookDispatcher: {
        startRetryProcessor: jest.fn(),
        stopRetryProcessor: jest.fn()
    }
}));

// Note: Temporal client mock is NOT included here.
// Individual test files should provide their own Temporal mocks
// so they can control and verify specific method calls.

jest.mock("../../src/core/observability", () => ({
    initializeOTel: jest.fn(),
    shutdownOTel: jest.fn().mockResolvedValue(undefined)
}));

// Mock EmailService to avoid loading .tsx templates
jest.mock("../../src/services/email/EmailService", () => ({
    emailService: {
        sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
        sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
        sendPasswordChangedNotification: jest.fn().mockResolvedValue(undefined),
        sendEmailChangedEmail: jest.fn().mockResolvedValue(undefined),
        sendNameChangedEmail: jest.fn().mockResolvedValue(undefined),
        sendNameChangedNotification: jest.fn().mockResolvedValue(undefined),
        sendTwoFactorDisabledEmail: jest.fn().mockResolvedValue(undefined),
        send2FABackupCodesEmail: jest.fn().mockResolvedValue(undefined),
        sendEmailVerification: jest.fn().mockResolvedValue(undefined)
    }
}));

// Mock OAuth provider registry to avoid config dependencies
jest.mock("../../src/services/oauth/OAuthProviderRegistry", () => ({
    OAUTH_PROVIDERS: {
        slack: {
            name: "slack",
            displayName: "Slack",
            authUrl: "https://slack.com/oauth/v2/authorize",
            tokenUrl: "https://slack.com/api/oauth.v2.access",
            scopes: ["chat:write"],
            clientId: "test-slack-client-id",
            clientSecret: "test-slack-client-secret",
            redirectUri: "http://localhost:3000/oauth/callback/slack"
        },
        google: {
            name: "google",
            displayName: "Google",
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["openid", "email", "profile"],
            clientId: "test-google-client-id",
            clientSecret: "test-google-client-secret",
            redirectUri: "http://localhost:3000/oauth/callback/google"
        },
        microsoft: {
            name: "microsoft",
            displayName: "Microsoft",
            authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes: ["openid", "email", "profile"],
            clientId: "test-microsoft-client-id",
            clientSecret: "test-microsoft-client-secret",
            redirectUri: "http://localhost:3000/oauth/callback/microsoft"
        }
    },
    getOAuthProvider: jest.fn((name: string) => {
        const providers: Record<string, unknown> = {
            slack: { name: "slack", clientId: "test-slack-client-id" },
            google: { name: "google", clientId: "test-google-client-id" },
            microsoft: { name: "microsoft", clientId: "test-microsoft-client-id" }
        };
        return providers[name] || null;
    }),
    isOAuthProvider: jest.fn((name: string) => ["slack", "google", "microsoft"].includes(name))
}));

// Mock OAuthService to avoid real OAuth operations
jest.mock("../../src/services/oauth/OAuthService", () => ({
    oauthService: {
        getAuthorizationUrl: jest.fn().mockReturnValue("https://oauth.example.com/auth"),
        exchangeCodeForTokens: jest.fn().mockResolvedValue({
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_in: 3600
        }),
        refreshAccessToken: jest.fn().mockResolvedValue({
            access_token: "new-test-access-token",
            expires_in: 3600
        }),
        revokeToken: jest.fn().mockResolvedValue(undefined)
    }
}));

// ============================================================================
// TEST SERVER FACTORY
// ============================================================================

const TEST_JWT_SECRET = "test-jwt-secret-for-integration-tests";

/**
 * Create a test Fastify server instance
 *
 * This creates a lightweight server suitable for integration testing.
 * External services (Redis, Temporal, etc.) are mocked.
 */
export async function createTestServer(options: TestServerOptions = {}): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: false // Disable logging in tests
    });

    // Register CORS
    await fastify.register(cors, {
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    });

    // Register JWT
    await fastify.register(jwt, {
        secret: options.jwtSecret || TEST_JWT_SECRET,
        sign: {
            expiresIn: options.jwtExpiresIn || "1h"
        }
    });

    // Register multipart for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB for tests
        }
    });

    // Configure JSON parser to allow empty bodies and return 400 for parse errors
    fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
        try {
            const json = body === "" || body === "{}" ? {} : JSON.parse(body as string);
            done(null, json);
        } catch (err) {
            // Return 400 Bad Request for malformed JSON instead of 500
            const error = err as Error & { statusCode?: number };
            error.statusCode = 400;
            done(error, undefined);
        }
    });

    // Health check route
    fastify.get("/health", async () => ({
        success: true,
        data: { status: "healthy", timestamp: new Date().toISOString() }
    }));

    if (!options.skipRoutes) {
        // Import routes dynamically to allow mocks to be set up first
        const { authRoutes } = await import("../../src/api/routes/auth");
        const { workflowRoutes } = await import("../../src/api/routes/workflows");
        const { agentRoutes } = await import("../../src/api/routes/agents");
        const { connectionRoutes } = await import("../../src/api/routes/connections");
        const { executionRoutes } = await import("../../src/api/routes/executions");
        const { triggerRoutes } = await import("../../src/api/routes/triggers");
        const { errorHandler } = await import("../../src/api/middleware");

        // Set error handler BEFORE routes so it applies to all route contexts
        fastify.setErrorHandler(errorHandler);

        // Register routes
        await fastify.register(authRoutes, { prefix: "/auth" });
        await fastify.register(workflowRoutes, { prefix: "/workflows" });
        await fastify.register(agentRoutes, { prefix: "/agents" });
        await fastify.register(connectionRoutes, { prefix: "/connections" });
        await fastify.register(executionRoutes, { prefix: "/executions" });
        await fastify.register(triggerRoutes);
    }

    return fastify;
}

/**
 * Close test server and clean up resources
 */
export async function closeTestServer(fastify: FastifyInstance | undefined): Promise<void> {
    if (fastify) {
        await fastify.close();
    }
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Create a JWT token for a test user
 */
export function createAuthToken(fastify: FastifyInstance, user: TestUser): string {
    return fastify.jwt.sign({
        id: user.id,
        email: user.email
    });
}

/**
 * Create a test user with default values
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || `test-${Date.now()}@example.com`,
        name: overrides.name || "Test User",
        emailVerified: overrides.emailVerified ?? true,
        twoFactorEnabled: overrides.twoFactorEnabled ?? false
    };
}

/**
 * Create authenticated headers for a request
 */
export function createAuthHeaders(
    fastify: FastifyInstance,
    user: TestUser
): Record<string, string> {
    const token = createAuthToken(fastify, user);
    return {
        Authorization: `Bearer ${token}`
    };
}

// ============================================================================
// REQUEST HELPERS
// ============================================================================

/**
 * Make an authenticated request to the test server
 */
export async function authenticatedRequest(
    fastify: FastifyInstance,
    user: TestUser,
    options: InjectOptions
): Promise<InjectResponse> {
    const headers = {
        ...createAuthHeaders(fastify, user),
        ...options.headers
    };

    const response = await fastify.inject({
        method: options.method,
        url: options.url,
        payload: options.payload,
        headers,
        query: options.query
    });

    return {
        statusCode: response.statusCode,
        headers: response.headers as Record<string, string>,
        payload: response.payload,
        json: <T = Record<string, unknown>>() => JSON.parse(response.payload) as T
    };
}

/**
 * Make an unauthenticated request to the test server
 */
export async function unauthenticatedRequest(
    fastify: FastifyInstance,
    options: InjectOptions
): Promise<InjectResponse> {
    const response = await fastify.inject({
        method: options.method,
        url: options.url,
        payload: options.payload,
        headers: options.headers,
        query: options.query
    });

    return {
        statusCode: response.statusCode,
        headers: response.headers as Record<string, string>,
        payload: response.payload,
        json: <T = Record<string, unknown>>() => JSON.parse(response.payload) as T
    };
}

// ============================================================================
// TEST DATA HELPERS
// ============================================================================

/**
 * Generate a valid workflow definition for testing
 * Matches the workflowDefinitionSchema with nodes having type, name, config, position
 */
export function createTestWorkflowDefinition(name: string = "Test Workflow") {
    return {
        name,
        nodes: {
            input: {
                type: "input",
                name: "input",
                config: {},
                position: { x: 0, y: 0 }
            },
            output: {
                type: "output",
                name: "output",
                config: {},
                position: { x: 200, y: 0 }
            }
        },
        edges: [
            {
                id: "input-output",
                source: "input",
                target: "output"
            }
        ],
        entryPoint: "input"
    };
}

/**
 * Generate a valid agent configuration for testing
 */
export function createTestAgentConfig(name: string = "Test Agent") {
    return {
        name,
        description: "A test agent",
        model: "gpt-4",
        provider: "openai",
        system_prompt: "You are a helpful assistant.",
        temperature: 0.7,
        max_tokens: 1000,
        max_iterations: 10,
        available_tools: [],
        memory_config: {
            type: "buffer",
            max_messages: 10
        }
    };
}

/**
 * Generate a valid connection configuration for testing
 */
export function createTestConnectionConfig(
    provider: string = "openai",
    method: "api_key" | "oauth2" | "basic_auth" = "api_key"
) {
    const base = {
        name: `Test ${provider} Connection`,
        connection_method: method,
        provider
    };

    if (method === "api_key") {
        return {
            ...base,
            data: {
                api_key: "test-api-key-12345"
            }
        };
    }

    if (method === "oauth2") {
        return {
            ...base,
            data: {
                access_token: "test-access-token",
                refresh_token: "test-refresh-token",
                token_type: "Bearer"
            },
            metadata: {
                expires_at: Date.now() + 3600000 // Schema expects number, not ISO string
            }
        };
    }

    return {
        ...base,
        data: {
            username: "testuser",
            password: "testpass"
        }
    };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that a response is successful (2xx status)
 */
export function expectSuccess(response: InjectResponse): void {
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
    expect(response.statusCode).toBeLessThan(300);
}

/**
 * Assert that a response is a specific status code
 */
export function expectStatus(response: InjectResponse, status: number): void {
    expect(response.statusCode).toBe(status);
}

/**
 * Assert that a response has the standard success format
 */
export function expectSuccessResponse<T>(response: InjectResponse): { success: true; data: T } {
    const body = response.json<{ success: boolean; data: T }>();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    return body as { success: true; data: T };
}

/**
 * Assert that a response has an error format
 * Handles both custom error format {success, error} and Fastify default {statusCode, error, message}
 */
export function expectErrorResponse(
    response: InjectResponse,
    expectedStatus: number
): { success: false; error: string } {
    expectStatus(response, expectedStatus);
    const body = response.json<{
        success?: boolean;
        error?: string;
        statusCode?: number;
        message?: string;
    }>();

    // Handle custom error format: { success: false, error: "..." }
    if (body.success !== undefined) {
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
        return { success: false, error: body.error! };
    }

    // Handle Fastify default error format: { statusCode, error, message }
    if (body.statusCode !== undefined) {
        expect(body.statusCode).toBe(expectedStatus);
        expect(body.message || body.error).toBeDefined();
        return { success: false, error: body.message || body.error! };
    }

    // Fallback - fail with helpful message
    throw new Error(`Unexpected error response format: ${JSON.stringify(body)}`);
}
