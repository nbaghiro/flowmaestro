/**
 * OAuth1ProviderRegistry Tests
 *
 * Tests for OAuth 1.0a provider configuration (OAuth1ProviderRegistry.ts)
 */

// Mock the config
jest.mock("../../../core/config", () => ({
    config: {
        oauth: {
            evernote: {
                consumerKey: "test-consumer-key",
                consumerSecret: "test-consumer-secret",
                sandbox: true
            }
        }
    },
    getOAuthRedirectUri: jest
        .fn()
        .mockReturnValue("http://localhost:3000/api/oauth1/evernote/callback")
}));

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

import {
    getOAuth1Provider,
    isOAuth1Provider,
    getOAuth1ProviderNames,
    OAUTH1_PROVIDERS
} from "../OAuth1ProviderRegistry";

describe("OAuth1ProviderRegistry", () => {
    describe("OAUTH1_PROVIDERS", () => {
        it("should have Evernote provider defined", () => {
            expect(OAUTH1_PROVIDERS.evernote).toBeDefined();
        });

        it("should have correct Evernote sandbox configuration", () => {
            const evernote = OAUTH1_PROVIDERS.evernote;

            expect(evernote.name).toBe("evernote");
            expect(evernote.displayName).toBe("Evernote");
            expect(evernote.signatureMethod).toBe("HMAC-SHA1");
            expect(evernote.requestTokenUrl).toContain("sandbox.evernote.com");
            expect(evernote.authorizeUrl).toContain("sandbox.evernote.com");
            expect(evernote.accessTokenUrl).toContain("sandbox.evernote.com");
        });

        it("should have consumerKey and consumerSecret from config", () => {
            const evernote = OAUTH1_PROVIDERS.evernote;

            expect(evernote.consumerKey).toBe("test-consumer-key");
            expect(evernote.consumerSecret).toBe("test-consumer-secret");
        });

        it("should have callback URL", () => {
            const evernote = OAUTH1_PROVIDERS.evernote;

            expect(evernote.callbackUrl).toContain("callback");
        });
    });

    describe("getOAuth1Provider", () => {
        it("should return Evernote provider configuration", () => {
            const provider = getOAuth1Provider("evernote");

            expect(provider).toBeDefined();
            expect(provider.name).toBe("evernote");
            expect(provider.displayName).toBe("Evernote");
        });

        it("should throw for unknown provider", () => {
            expect(() => getOAuth1Provider("unknown-provider")).toThrow(
                /Unknown OAuth 1.0a provider: unknown-provider/
            );
        });

        it("should return provider with all required fields", () => {
            const provider = getOAuth1Provider("evernote");

            expect(provider).toHaveProperty("name");
            expect(provider).toHaveProperty("displayName");
            expect(provider).toHaveProperty("requestTokenUrl");
            expect(provider).toHaveProperty("authorizeUrl");
            expect(provider).toHaveProperty("accessTokenUrl");
            expect(provider).toHaveProperty("consumerKey");
            expect(provider).toHaveProperty("consumerSecret");
            expect(provider).toHaveProperty("callbackUrl");
            expect(provider).toHaveProperty("signatureMethod");
        });

        it("should include getUserInfo function when available", () => {
            const provider = getOAuth1Provider("evernote");

            expect(provider.getUserInfo).toBeDefined();
            expect(typeof provider.getUserInfo).toBe("function");
        });
    });

    describe("isOAuth1Provider", () => {
        it("should return true for Evernote", () => {
            expect(isOAuth1Provider("evernote")).toBe(true);
        });

        it("should return false for OAuth2 providers", () => {
            expect(isOAuth1Provider("google")).toBe(false);
            expect(isOAuth1Provider("github")).toBe(false);
            expect(isOAuth1Provider("slack")).toBe(false);
        });

        it("should return false for unknown providers", () => {
            expect(isOAuth1Provider("unknown")).toBe(false);
        });
    });

    describe("getOAuth1ProviderNames", () => {
        it("should return array of provider names", () => {
            const names = getOAuth1ProviderNames();

            expect(Array.isArray(names)).toBe(true);
            expect(names).toContain("evernote");
        });

        it("should return all registered providers", () => {
            const names = getOAuth1ProviderNames();
            const registeredProviders = Object.keys(OAUTH1_PROVIDERS);

            expect(names.length).toBe(registeredProviders.length);
            registeredProviders.forEach((provider) => {
                expect(names).toContain(provider);
            });
        });
    });

    describe("Provider URL configuration", () => {
        it("should use sandbox URLs when sandbox is true", () => {
            const provider = getOAuth1Provider("evernote");

            expect(provider.requestTokenUrl).toContain("sandbox.evernote.com");
            expect(provider.authorizeUrl).toContain("sandbox.evernote.com");
            expect(provider.accessTokenUrl).toContain("sandbox.evernote.com");
        });
    });

    describe("getUserInfo function", () => {
        it("should return empty object for Evernote (user info in token response)", async () => {
            const provider = getOAuth1Provider("evernote");

            if (provider.getUserInfo) {
                const userInfo = await provider.getUserInfo("token", "secret");
                expect(userInfo).toEqual({});
            }
        });
    });
});
