/**
 * OAuth1Service Tests
 *
 * Tests for OAuth 1.0a authentication flow (OAuth1Service.ts)
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

// Mock the OAuth1ProviderRegistry
jest.mock("../OAuth1ProviderRegistry", () => ({
    getOAuth1Provider: jest.fn()
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { getOAuth1Provider } from "../OAuth1ProviderRegistry";
import { OAuth1Service, oauth1Service } from "../OAuth1Service";

const mockGetOAuth1Provider = getOAuth1Provider as jest.Mock;

function createMockProvider(overrides: Record<string, unknown> = {}) {
    return {
        name: "evernote",
        displayName: "Evernote",
        requestTokenUrl: "https://sandbox.evernote.com/oauth",
        authorizeUrl: "https://sandbox.evernote.com/OAuth.action",
        accessTokenUrl: "https://sandbox.evernote.com/oauth",
        consumerKey: "test-consumer-key",
        consumerSecret: "test-consumer-secret",
        callbackUrl: "http://localhost:3000/api/oauth1/evernote/callback",
        signatureMethod: "HMAC-SHA1",
        ...overrides
    };
}

describe("OAuth1Service", () => {
    let service: OAuth1Service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new OAuth1Service();
        mockGetOAuth1Provider.mockReturnValue(createMockProvider());
        mockFetch.mockReset();
    });

    describe("getRequestToken", () => {
        it("should get request token and return auth URL", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve(
                        "oauth_token=request-token-123&oauth_token_secret=request-secret-456&oauth_callback_confirmed=true"
                    )
            });

            const result = await service.getRequestToken("evernote", "user-123", "ws-456");

            expect(result.authUrl).toContain("https://sandbox.evernote.com/OAuth.action");
            expect(result.authUrl).toContain("oauth_token=request-token-123");
        });

        it("should send Authorization header with signature", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            await service.getRequestToken("evernote", "user-123", "ws-456");

            expect(mockFetch).toHaveBeenCalled();
            const fetchOptions = mockFetch.mock.calls[0][1];
            expect(fetchOptions.headers.Authorization).toMatch(/^OAuth /);
            expect(fetchOptions.headers.Authorization).toContain("oauth_consumer_key=");
            expect(fetchOptions.headers.Authorization).toContain("oauth_signature=");
            expect(fetchOptions.headers.Authorization).toContain(
                'oauth_signature_method="HMAC-SHA1"'
            );
        });

        it("should include oauth_callback in request", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            await service.getRequestToken("evernote", "user-123", "ws-456");

            const fetchOptions = mockFetch.mock.calls[0][1];
            expect(fetchOptions.headers.Authorization).toContain("oauth_callback=");
        });

        it("should throw on request token failure", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: () => Promise.resolve("Invalid consumer key")
            });

            await expect(service.getRequestToken("evernote", "user-123", "ws-456")).rejects.toThrow(
                /Failed to get request token/
            );
        });

        it("should throw when response missing oauth_token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token_secret=secret-only")
            });

            await expect(service.getRequestToken("evernote", "user-123", "ws-456")).rejects.toThrow(
                /missing oauth_token or oauth_token_secret/
            );
        });

        it("should throw when response missing oauth_token_secret", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token-only")
            });

            await expect(service.getRequestToken("evernote", "user-123", "ws-456")).rejects.toThrow(
                /missing oauth_token or oauth_token_secret/
            );
        });
    });

    describe("exchangeForAccessToken", () => {
        beforeEach(async () => {
            // First get a request token to set up state
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve(
                        "oauth_token=request-token-123&oauth_token_secret=request-secret-456"
                    )
            });
            await service.getRequestToken("evernote", "user-123", "ws-456");
            mockFetch.mockReset();
        });

        it("should exchange request token for access token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve(
                        "oauth_token=access-token-789&oauth_token_secret=access-secret-012"
                    )
            });

            const result = await service.exchangeForAccessToken(
                "evernote",
                "request-token-123",
                "verifier-abc"
            );

            expect(result.tokens.oauth_token).toBe("access-token-789");
            expect(result.tokens.oauth_token_secret).toBe("access-secret-012");
            expect(result.userId).toBe("user-123");
            expect(result.workspaceId).toBe("ws-456");
            expect(result.provider).toBe("evernote");
        });

        it("should include oauth_verifier in request", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            await service.exchangeForAccessToken("evernote", "request-token-123", "verifier-abc");

            const fetchOptions = mockFetch.mock.calls[0][1];
            expect(fetchOptions.headers.Authorization).toContain("oauth_verifier=");
        });

        it("should capture extra parameters from response", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve(
                        "oauth_token=token&oauth_token_secret=secret&edam_userId=12345&edam_shard=s123"
                    )
            });

            const result = await service.exchangeForAccessToken(
                "evernote",
                "request-token-123",
                "verifier-abc"
            );

            expect(result.tokens.edam_userId).toBe("12345");
            expect(result.tokens.edam_shard).toBe("s123");
        });

        it("should throw on invalid request token", async () => {
            await expect(
                service.exchangeForAccessToken("evernote", "invalid-token", "verifier")
            ).rejects.toThrow(/Invalid or expired request token/);
        });

        it("should throw on access token failure", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                text: () => Promise.resolve("Invalid verifier")
            });

            await expect(
                service.exchangeForAccessToken("evernote", "request-token-123", "invalid-verifier")
            ).rejects.toThrow(/Failed to get access token/);
        });

        it("should call getUserInfo when provider supports it", async () => {
            const getUserInfo = jest
                .fn()
                .mockResolvedValue({ userId: "123", username: "testuser" });
            mockGetOAuth1Provider.mockReturnValue(createMockProvider({ getUserInfo }));

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            const result = await service.exchangeForAccessToken(
                "evernote",
                "request-token-123",
                "verifier-abc"
            );

            expect(getUserInfo).toHaveBeenCalledWith("token", "secret");
            expect(result.accountInfo).toEqual({ userId: "123", username: "testuser" });
        });

        it("should continue when getUserInfo fails", async () => {
            const getUserInfo = jest.fn().mockRejectedValue(new Error("API error"));
            mockGetOAuth1Provider.mockReturnValue(createMockProvider({ getUserInfo }));

            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            const result = await service.exchangeForAccessToken(
                "evernote",
                "request-token-123",
                "verifier-abc"
            );

            expect(result.accountInfo).toEqual({});
        });
    });

    describe("generateSignedHeader", () => {
        it("should generate valid OAuth Authorization header", () => {
            const header = service.generateSignedHeader(
                "GET",
                "https://api.example.com/resource",
                "consumer-key",
                "consumer-secret",
                "access-token",
                "token-secret"
            );

            expect(header).toMatch(/^OAuth /);
            expect(header).toContain('oauth_consumer_key="consumer-key"');
            expect(header).toContain('oauth_token="access-token"');
            expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
            expect(header).toContain("oauth_signature=");
            expect(header).toContain("oauth_nonce=");
            expect(header).toContain("oauth_timestamp=");
            expect(header).toContain('oauth_version="1.0"');
        });

        it("should include extra params in signature", () => {
            const header = service.generateSignedHeader(
                "POST",
                "https://api.example.com/resource",
                "consumer-key",
                "consumer-secret",
                "access-token",
                "token-secret",
                { extra_param: "extra_value" }
            );

            expect(header).toContain('extra_param="extra_value"');
        });
    });

    describe("State token management", () => {
        it("should consume state token only once (one-time use)", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve("oauth_token=request-token&oauth_token_secret=request-secret")
            });
            await service.getRequestToken("evernote", "user-123", "ws-456");

            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve("oauth_token=access&oauth_token_secret=secret")
            });

            // First use should succeed
            await service.exchangeForAccessToken("evernote", "request-token", "verifier");

            // Second use should fail (token consumed)
            await expect(
                service.exchangeForAccessToken("evernote", "request-token", "verifier")
            ).rejects.toThrow(/Invalid or expired request token/);
        });

        it("should reject expired state token", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () =>
                    Promise.resolve("oauth_token=request-token&oauth_token_secret=request-secret")
            });
            await service.getRequestToken("evernote", "user-123", "ws-456");

            // Mock Date.now to simulate expiry (10+ minutes)
            const originalNow = Date.now;
            Date.now = () => originalNow() + 11 * 60 * 1000;

            try {
                await expect(
                    service.exchangeForAccessToken("evernote", "request-token", "verifier")
                ).rejects.toThrow(/Invalid or expired request token/);
            } finally {
                Date.now = originalNow;
            }
        });
    });

    describe("Singleton instance", () => {
        it("should export singleton oauth1Service", () => {
            expect(oauth1Service).toBeInstanceOf(OAuth1Service);
        });
    });

    describe("Signature generation", () => {
        it("should generate unique nonce for each request", async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            await service.getRequestToken("evernote", "user-1", "ws-1");
            await service.getRequestToken("evernote", "user-2", "ws-2");

            const auth1 = mockFetch.mock.calls[0][1].headers.Authorization;
            const auth2 = mockFetch.mock.calls[1][1].headers.Authorization;

            // Extract nonce from Authorization headers
            const nonce1 = auth1.match(/oauth_nonce="([^"]+)"/)?.[1];
            const nonce2 = auth2.match(/oauth_nonce="([^"]+)"/)?.[1];

            expect(nonce1).toBeDefined();
            expect(nonce2).toBeDefined();
            expect(nonce1).not.toBe(nonce2);
        });

        it("should include current timestamp in signature", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve("oauth_token=token&oauth_token_secret=secret")
            });

            const beforeTimestamp = Math.floor(Date.now() / 1000);
            await service.getRequestToken("evernote", "user-123", "ws-456");
            const afterTimestamp = Math.floor(Date.now() / 1000);

            const auth = mockFetch.mock.calls[0][1].headers.Authorization;
            const timestamp = parseInt(auth.match(/oauth_timestamp="(\d+)"/)?.[1] || "0");

            expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
        });
    });
});
