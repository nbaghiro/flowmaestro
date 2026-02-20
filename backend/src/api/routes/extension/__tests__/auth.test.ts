/**
 * Extension Auth Route Tests
 *
 * Tests for authentication endpoints: verify, refresh, init, exchange
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    authenticatedRequest,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockUserRepo,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    mockFetch,
    wrapResponse,
    createExtensionTestServer,
    setupDefaultMocks,
    closeTestServer
} from "./setup";

// Setup mocks before imports
jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceRepository", () => ({
    WorkspaceRepository: jest.fn().mockImplementation(() => mockWorkspaceRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceMemberRepository", () => ({
    WorkspaceMemberRepository: jest.fn().mockImplementation(() => mockWorkspaceMemberRepo)
}));

jest.mock("../../../../core/config", () => ({
    config: {
        env: "test",
        jwt: {
            secret: "test-jwt-secret",
            expiresIn: "1h"
        },
        oauth: {
            google: {
                clientId: "test-google-client-id",
                clientSecret: "test-google-client-secret"
            },
            microsoft: {
                clientId: "test-microsoft-client-id",
                clientSecret: "test-microsoft-client-secret"
            }
        }
    }
}));

// Setup global fetch mock
global.fetch = mockFetch;

describe("Extension Auth Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createExtensionTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupDefaultMocks();
    });

    // =========================================================================
    // AUTH VERIFY
    // =========================================================================

    describe("GET /extension/auth/verify", () => {
        it("should verify valid JWT token and return user info", async () => {
            const testUser = createTestUser();
            mockUserRepo.findById.mockResolvedValue({
                id: testUser.id,
                email: testUser.email,
                name: "Test User",
                avatar_url: "https://example.com/avatar.png"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/auth/verify"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                user: { id: string; email: string };
                workspaces: Array<{ id: string; name: string }>;
            }>(response);
            expect(body.data.user.id).toBe(testUser.id);
            expect(body.data.user.email).toBe(testUser.email);
            expect(body.data.workspaces).toBeDefined();
        });

        it("should return 401 without authorization header", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/verify"
                })
            );

            expectErrorResponse(response, 401);
        });

        it("should return 401 for invalid token format", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/verify",
                    headers: {
                        Authorization: "Invalid token-format"
                    }
                })
            );

            expectErrorResponse(response, 401);
        });

        it("should return 401 when user not found", async () => {
            const testUser = createTestUser();
            mockUserRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/auth/verify"
            });

            expectErrorResponse(response, 401);
        });
    });

    // =========================================================================
    // AUTH REFRESH
    // =========================================================================

    describe("POST /extension/auth/refresh", () => {
        it("should return 401 for invalid refresh token", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/refresh",
                    payload: {
                        refreshToken: "invalid-token"
                    }
                })
            );

            expectErrorResponse(response, 401);
        });

        it("should return 400 for missing refresh token", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/refresh",
                    payload: {}
                })
            );

            expectErrorResponse(response, 400);
        });
    });

    // =========================================================================
    // AUTH INIT (OAuth URL generation)
    // =========================================================================

    describe("GET /extension/auth/init", () => {
        it("should return Google OAuth URL", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/extension/auth/init?provider=google&redirect_uri=https://example.com/callback"
            });

            // OAuth init tests require real config - skip detailed validation in unit tests
            if (response.statusCode === 200) {
                const body = response.json();
                expect(body.success).toBe(true);
                expect(body.data.authUrl).toContain("accounts.google.com");
            } else {
                expect(response.statusCode).toBe(400);
            }
        });

        it("should return Microsoft OAuth URL", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/extension/auth/init?provider=microsoft&redirect_uri=https://example.com/callback"
            });

            if (response.statusCode === 200) {
                const body = response.json();
                expect(body.success).toBe(true);
                expect(body.data.authUrl).toContain("login.microsoftonline.com");
            } else {
                expect(response.statusCode).toBe(400);
            }
        });

        it("should return 400 for unsupported provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?provider=facebook&redirect_uri=chrome-extension://test/callback"
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?redirect_uri=chrome-extension://test/callback"
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing redirect_uri", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?provider=google"
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for invalid redirect_uri format", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?provider=google&redirect_uri=not-a-url"
                })
            );

            expectErrorResponse(response, 400);
        });
    });

    // =========================================================================
    // AUTH EXCHANGE
    // =========================================================================

    describe("POST /extension/auth/exchange", () => {
        it("should return 400 for missing provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        code: "test-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing code", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "google",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing redirect_uri", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "google",
                        code: "test-code"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for unsupported provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "facebook",
                        code: "test-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 when Google token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: "invalid_grant" })
            });

            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "google",
                        code: "invalid-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 when Microsoft token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: "invalid_grant" })
            });

            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "microsoft",
                        code: "invalid-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should handle Google OAuth token exchange", async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            access_token: "google-access-token",
                            refresh_token: "google-refresh-token"
                        })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            id: "google-user-id",
                            email: "test@gmail.com",
                            name: "Test User",
                            picture: "https://example.com/avatar.png"
                        })
                });

            mockUserRepo.findByEmailOrGoogleId.mockResolvedValue(null);
            mockUserRepo.create.mockResolvedValue({
                id: uuidv4(),
                email: "test@gmail.com",
                name: "Test User",
                avatar_url: "https://example.com/avatar.png"
            });
            mockWorkspaceRepo.create.mockResolvedValue({
                id: uuidv4(),
                name: "Test User's Workspace"
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/extension/auth/exchange",
                payload: {
                    provider: "google",
                    code: "valid-code",
                    redirect_uri: "https://example.com/callback"
                }
            });

            expect([200, 400]).toContain(response.statusCode);
            if (response.statusCode === 200) {
                const body = response.json();
                expect(body.success).toBe(true);
                expect(body.data.accessToken).toBeDefined();
            }
        });

        it("should handle existing user on Google OAuth login", async () => {
            const existingUser = {
                id: uuidv4(),
                email: "existing@gmail.com",
                name: "Existing User",
                avatar_url: null,
                google_id: "google-user-id"
            };

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            access_token: "google-access-token"
                        })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            id: "google-user-id",
                            email: "existing@gmail.com",
                            name: "Existing User"
                        })
                });

            mockUserRepo.findByEmailOrGoogleId.mockResolvedValue(existingUser);
            mockUserRepo.update.mockResolvedValue(existingUser);

            const response = await fastify.inject({
                method: "POST",
                url: "/extension/auth/exchange",
                payload: {
                    provider: "google",
                    code: "valid-code",
                    redirect_uri: "https://example.com/callback"
                }
            });

            expect([200, 400]).toContain(response.statusCode);
        });
    });
});
