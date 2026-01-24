/**
 * OAuthService Tests
 *
 * Tests for generic OAuth 2.0 service (OAuthService.ts)
 */

// Mock the logging module
jest.mock("../../../core/logging", () => ({
    createServiceLogger: jest.fn().mockReturnValue({
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn()
    })
}));

// Mock the OAuthProviderRegistry
jest.mock("../OAuthProviderRegistry", () => ({
    getOAuthProvider: jest.fn()
}));

// Mock the PKCE utilities
jest.mock("../utils/pkce", () => ({
    generatePKCEPair: jest.fn().mockReturnValue({
        codeVerifier: "mock-code-verifier",
        codeChallenge: "mock-code-challenge"
    })
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { getOAuthProvider } from "../OAuthProviderRegistry";
import { OAuthService } from "../OAuthService";
import { generatePKCEPair } from "../utils/pkce";

const mockGetOAuthProvider = getOAuthProvider as jest.Mock;

function createMockProvider(overrides: Record<string, unknown> = {}) {
    return {
        name: "google",
        clientId: "test-client-id",
        clientSecret: "test-client-secret",
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        redirectUri: "http://localhost:3000/api/oauth/google/callback",
        scopes: ["email", "profile"],
        pkceEnabled: false,
        refreshable: true,
        authParams: {},
        getUserInfo: jest.fn().mockResolvedValue({ email: "user@example.com" }),
        ...overrides
    };
}

describe("OAuthService", () => {
    let service: OAuthService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new OAuthService();
        mockGetOAuthProvider.mockReturnValue(createMockProvider());
    });

    describe("generateAuthUrl", () => {
        it("should generate authorization URL with all parameters", () => {
            const url = service.generateAuthUrl("google", "user-123", "ws-456");

            expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
            expect(url).toContain("client_id=test-client-id");
            expect(url).toContain("redirect_uri=");
            expect(url).toContain("response_type=code");
            expect(url).toContain("state=");
            expect(url).toContain("scope=email+profile");
        });

        it("should include PKCE parameters when enabled", () => {
            mockGetOAuthProvider.mockReturnValue(createMockProvider({ pkceEnabled: true }));

            const url = service.generateAuthUrl("google", "user-123", "ws-456");

            expect(url).toContain("code_challenge=mock-code-challenge");
            expect(url).toContain("code_challenge_method=S256");
            expect(generatePKCEPair).toHaveBeenCalled();
        });

        it("should not include PKCE when disabled", () => {
            mockGetOAuthProvider.mockReturnValue(createMockProvider({ pkceEnabled: false }));

            const url = service.generateAuthUrl("google", "user-123", "ws-456");

            expect(url).not.toContain("code_challenge");
        });

        it("should handle Zendesk with subdomain", () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    name: "zendesk",
                    authUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new"
                })
            );

            const url = service.generateAuthUrl("zendesk", "user-123", "ws-456", {
                subdomain: "mycompany"
            });

            expect(url).toContain("https://mycompany.zendesk.com");
        });

        it("should throw when Zendesk subdomain is missing", () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    name: "zendesk",
                    authUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new"
                })
            );

            expect(() => service.generateAuthUrl("zendesk", "user-123", "ws-456")).toThrow(
                /Zendesk requires a subdomain/
            );
        });

        it("should handle Shopify with shop name", () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    name: "shopify",
                    authUrl: "https://{shop}.myshopify.com/admin/oauth/authorize"
                })
            );

            const url = service.generateAuthUrl("shopify", "user-123", "ws-456", {
                subdomain: "mystore"
            });

            expect(url).toContain("https://mystore.myshopify.com");
        });

        it("should throw when Shopify shop name is missing", () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    name: "shopify",
                    authUrl: "https://{shop}.myshopify.com/admin/oauth/authorize"
                })
            );

            expect(() => service.generateAuthUrl("shopify", "user-123", "ws-456")).toThrow(
                /Shopify requires a shop name/
            );
        });

        it("should include custom auth params from provider", () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    authParams: { access_type: "offline", prompt: "consent" }
                })
            );

            const url = service.generateAuthUrl("google", "user-123", "ws-456");

            expect(url).toContain("access_type=offline");
            expect(url).toContain("prompt=consent");
        });

        it("should generate unique state tokens", () => {
            const url1 = service.generateAuthUrl("google", "user-123", "ws-456");
            const url2 = service.generateAuthUrl("google", "user-123", "ws-456");

            const state1 = new URL(url1).searchParams.get("state");
            const state2 = new URL(url2).searchParams.get("state");

            expect(state1).not.toBe(state2);
        });
    });

    describe("exchangeCodeForToken", () => {
        beforeEach(() => {
            mockFetch.mockReset();
        });

        it("should exchange code for tokens successfully", async () => {
            // First generate an auth URL to create a state token
            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "access-token-123",
                        refresh_token: "refresh-token-456",
                        token_type: "Bearer",
                        expires_in: 3600
                    })
            });

            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    getUserInfo: jest.fn().mockResolvedValue({ email: "user@example.com" })
                })
            );

            const result = await service.exchangeCodeForToken("google", "auth-code", state);

            expect(result).toMatchObject({
                userId: "user-123",
                workspaceId: "ws-456",
                provider: "google",
                tokens: {
                    access_token: "access-token-123",
                    refresh_token: "refresh-token-456",
                    token_type: "Bearer",
                    expires_in: 3600
                }
            });
        });

        it("should throw on invalid state token", async () => {
            await expect(
                service.exchangeCodeForToken("google", "auth-code", "invalid-state")
            ).rejects.toThrow(/Invalid or expired state token/);
        });

        it("should throw on expired state token", async () => {
            // Generate state and manually expire it
            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            // Mock Date.now to simulate expiry
            const originalNow = Date.now;
            Date.now = () => originalNow() + 6 * 60 * 1000; // 6 minutes later

            try {
                await expect(
                    service.exchangeCodeForToken("google", "auth-code", state)
                ).rejects.toThrow(/Invalid or expired state token/);
            } finally {
                Date.now = originalNow;
            }
        });

        it("should handle token exchange failure", async () => {
            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: "Bad Request",
                json: () =>
                    Promise.resolve({
                        error: "invalid_grant",
                        error_description: "Code has expired"
                    })
            });

            await expect(
                service.exchangeCodeForToken("google", "expired-code", state)
            ).rejects.toThrow(/Code has expired/);
        });

        it("should include PKCE verifier when present", async () => {
            mockGetOAuthProvider.mockReturnValue(createMockProvider({ pkceEnabled: true }));

            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "access-token",
                        token_type: "Bearer"
                    })
            });

            await service.exchangeCodeForToken("google", "auth-code", state);

            const fetchCall = mockFetch.mock.calls[0];
            const body = fetchCall[1].body;
            expect(body).toContain("code_verifier=mock-code-verifier");
        });

        it("should fetch user info when available", async () => {
            const getUserInfo = jest.fn().mockResolvedValue({
                id: "user-id",
                email: "user@example.com",
                name: "Test User"
            });

            mockGetOAuthProvider.mockReturnValue(createMockProvider({ getUserInfo }));

            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "access-token",
                        token_type: "Bearer"
                    })
            });

            const result = await service.exchangeCodeForToken("google", "auth-code", state);

            expect(getUserInfo).toHaveBeenCalledWith("access-token", undefined);
            expect(result.accountInfo).toEqual({
                id: "user-id",
                email: "user@example.com",
                name: "Test User"
            });
        });

        it("should continue when getUserInfo fails", async () => {
            const getUserInfo = jest.fn().mockRejectedValue(new Error("API error"));

            mockGetOAuthProvider.mockReturnValue(createMockProvider({ getUserInfo }));

            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "access-token",
                        token_type: "Bearer"
                    })
            });

            const result = await service.exchangeCodeForToken("google", "auth-code", state);

            expect(result.accountInfo).toEqual({});
        });
    });

    describe("refreshAccessToken", () => {
        beforeEach(() => {
            mockFetch.mockReset();
        });

        it("should refresh token successfully", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "new-access-token",
                        refresh_token: "new-refresh-token",
                        token_type: "Bearer",
                        expires_in: 3600
                    })
            });

            const result = await service.refreshAccessToken("google", "old-refresh-token");

            expect(result).toEqual({
                access_token: "new-access-token",
                refresh_token: "new-refresh-token",
                token_type: "Bearer",
                expires_in: 3600
            });
        });

        it("should keep old refresh token when new one not provided", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "new-access-token",
                        token_type: "Bearer"
                    })
            });

            const result = await service.refreshAccessToken("google", "old-refresh-token");

            expect(result.refresh_token).toBe("old-refresh-token");
        });

        it("should throw when provider does not support refresh", async () => {
            mockGetOAuthProvider.mockReturnValue(createMockProvider({ refreshable: false }));

            await expect(service.refreshAccessToken("twitter", "refresh-token")).rejects.toThrow(
                /does not support token refresh/
            );
        });

        it("should handle refresh failure", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: "Bad Request",
                json: () =>
                    Promise.resolve({
                        error: "invalid_grant",
                        error_description: "Token has been revoked"
                    })
            });

            await expect(service.refreshAccessToken("google", "revoked-token")).rejects.toThrow(
                /Token has been revoked/
            );
        });
    });

    describe("revokeToken", () => {
        beforeEach(() => {
            mockFetch.mockReset();
        });

        it("should revoke token when provider supports it", async () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    revokeUrl: "https://oauth2.googleapis.com/revoke"
                })
            );

            mockFetch.mockResolvedValueOnce({ ok: true });

            await service.revokeToken("google", "access-token");

            expect(mockFetch).toHaveBeenCalled();
            const fetchUrl = mockFetch.mock.calls[0][0];
            expect(fetchUrl).toContain("https://oauth2.googleapis.com/revoke");
            expect(fetchUrl).toContain("token=access-token");
        });

        it("should do nothing when provider does not support revocation", async () => {
            mockGetOAuthProvider.mockReturnValue(createMockProvider({ revokeUrl: undefined }));

            await service.revokeToken("google", "access-token");

            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("should not throw on revocation failure", async () => {
            mockGetOAuthProvider.mockReturnValue(
                createMockProvider({
                    revokeUrl: "https://oauth2.googleapis.com/revoke"
                })
            );

            mockFetch.mockRejectedValueOnce(new Error("Network error"));

            // Should not throw
            await expect(service.revokeToken("google", "access-token")).resolves.toBeUndefined();
        });
    });

    describe("State token management", () => {
        it("should validate state token only once (one-time use)", async () => {
            const authUrl = service.generateAuthUrl("google", "user-123", "ws-456");
            const state = new URL(authUrl).searchParams.get("state")!;

            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        access_token: "access-token",
                        token_type: "Bearer"
                    })
            });

            // First use should succeed
            await service.exchangeCodeForToken("google", "auth-code", state);

            // Second use should fail (token consumed)
            await expect(
                service.exchangeCodeForToken("google", "auth-code", state)
            ).rejects.toThrow(/Invalid or expired state token/);
        });
    });
});
