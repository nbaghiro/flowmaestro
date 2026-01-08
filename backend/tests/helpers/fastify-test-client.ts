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

jest.mock("../../src/temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue({
        workflow: { start: jest.fn(), getHandle: jest.fn() }
    }),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../src/core/observability", () => ({
    initializeOTel: jest.fn(),
    shutdownOTel: jest.fn().mockResolvedValue(undefined)
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

    // Configure JSON parser to allow empty bodies
    fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
        try {
            const json = body === "" || body === "{}" ? {} : JSON.parse(body as string);
            done(null, json);
        } catch (err) {
            done(err as Error, undefined);
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

        // Register routes
        await fastify.register(authRoutes, { prefix: "/auth" });
        await fastify.register(workflowRoutes, { prefix: "/workflows" });
        await fastify.register(agentRoutes, { prefix: "/agents" });
        await fastify.register(connectionRoutes, { prefix: "/connections" });
        await fastify.register(executionRoutes, { prefix: "/executions" });
        await fastify.register(triggerRoutes);

        // Error handler
        fastify.setErrorHandler(errorHandler);
    }

    return fastify;
}

/**
 * Close test server and clean up resources
 */
export async function closeTestServer(fastify: FastifyInstance): Promise<void> {
    await fastify.close();
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
 */
export function createTestWorkflowDefinition(name: string = "Test Workflow") {
    return {
        name,
        nodes: {
            input: {
                id: "input",
                type: "input",
                position: { x: 0, y: 0 },
                data: { name: "input" }
            },
            output: {
                id: "output",
                type: "output",
                position: { x: 200, y: 0 },
                data: { name: "output" }
            }
        },
        edges: [
            {
                id: "input-output",
                source: "input",
                target: "output",
                sourceHandle: "output",
                targetHandle: "input"
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
                refresh_token: "test-refresh-token"
            },
            metadata: {
                expires_at: new Date(Date.now() + 3600000).toISOString()
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
 */
export function expectErrorResponse(
    response: InjectResponse,
    expectedStatus: number
): { success: false; error: string } {
    expectStatus(response, expectedStatus);
    const body = response.json<{ success: boolean; error: string }>();
    expect(body.success).toBe(false);
    expect(body.error).toBeDefined();
    return body as { success: false; error: string };
}
