/**
 * OAuth Admin Scheduler Tests
 *
 * Tests for OAuth admin/scheduler endpoints:
 * - GET /oauth/scheduler/status - Get scheduler status
 * - POST /oauth/scheduler/refresh - Force refresh
 * - POST /oauth/scheduler/reset-circuit - Reset circuit breaker
 */

import { FastifyInstance } from "fastify";

import {
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
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

describe("OAuth Admin Scheduler Endpoints", () => {
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
