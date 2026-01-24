/**
 * OAuthProviderRegistry Tests
 *
 * Tests for OAuth provider configuration and lookup functions.
 */

// Create a Proxy-based mock that provides default values for any provider
const createOAuthConfigProxy = () => {
    // Providers that should appear unconfigured (no credentials)
    const unconfiguredProviders = new Set(["microsoft", "trello"]);

    // Special providers with extra fields
    const specialProviders: Record<string, Record<string, unknown>> = {
        meta: {
            clientId: "meta-client-id",
            clientSecret: "meta-client-secret",
            whatsappConfigId: "whatsapp-config-id"
        },
        googleServiceAccount: {
            clientEmail: "test@test.iam.gserviceaccount.com",
            privateKey: "test-private-key"
        }
    };

    return new Proxy(
        {},
        {
            get(_target, prop: string) {
                if (specialProviders[prop]) {
                    return specialProviders[prop];
                }
                if (unconfiguredProviders.has(prop)) {
                    return { clientId: "", clientSecret: "" };
                }
                return {
                    clientId: `${prop}-client-id`,
                    clientSecret: `${prop}-client-secret`
                };
            }
        }
    );
};

// Mock config before importing the module
jest.mock("../../../core/config", () => ({
    config: {
        oauth: createOAuthConfigProxy(),
        appUrl: "http://localhost:3000"
    },
    getOAuthRedirectUri: (provider: string) =>
        `http://localhost:3001/api/oauth/${provider}/callback`
}));

import {
    OAUTH_PROVIDERS,
    getOAuthProvider,
    listOAuthProviders,
    isProviderConfigured
} from "../OAuthProviderRegistry";

describe("OAuthProviderRegistry", () => {
    describe("OAUTH_PROVIDERS", () => {
        it("should have slack provider configured", () => {
            expect(OAUTH_PROVIDERS.slack).toBeDefined();
            expect(OAUTH_PROVIDERS.slack.name).toBe("slack");
            expect(OAUTH_PROVIDERS.slack.displayName).toBe("Slack");
            expect(OAUTH_PROVIDERS.slack.authUrl).toContain("slack.com");
            expect(OAUTH_PROVIDERS.slack.tokenUrl).toContain("slack.com");
            expect(OAUTH_PROVIDERS.slack.scopes).toBeInstanceOf(Array);
        });

        it("should have google provider configured", () => {
            expect(OAUTH_PROVIDERS.google).toBeDefined();
            expect(OAUTH_PROVIDERS.google.name).toBe("google");
            expect(OAUTH_PROVIDERS.google.authUrl).toContain("google.com");
        });

        it("should have github provider configured", () => {
            expect(OAUTH_PROVIDERS.github).toBeDefined();
            expect(OAUTH_PROVIDERS.github.name).toBe("github");
            expect(OAUTH_PROVIDERS.github.authUrl).toContain("github.com");
        });

        it("should have required fields for each provider", () => {
            const requiredFields = [
                "name",
                "displayName",
                "authUrl",
                "tokenUrl",
                "scopes",
                "redirectUri"
            ];

            Object.entries(OAUTH_PROVIDERS).forEach(([key, provider]) => {
                requiredFields.forEach((field) => {
                    expect(provider).toHaveProperty(field);
                });
                expect(provider.name).toBe(key);
            });
        });

        it("should have valid URLs for auth and token endpoints", () => {
            Object.values(OAUTH_PROVIDERS).forEach((provider) => {
                expect(provider.authUrl).toMatch(/^https?:\/\//);
                expect(provider.tokenUrl).toMatch(/^https?:\/\//);
            });
        });

        it("should have scopes as arrays", () => {
            Object.values(OAUTH_PROVIDERS).forEach((provider) => {
                expect(Array.isArray(provider.scopes)).toBe(true);
                // Most providers have scopes, but some may have empty arrays (e.g., implicit scopes)
            });
        });

        it("should have most providers with defined scopes", () => {
            const providersWithScopes = Object.values(OAUTH_PROVIDERS).filter(
                (p) => p.scopes.length > 0
            );
            // At least 90% of providers should have scopes defined
            expect(providersWithScopes.length).toBeGreaterThan(
                Object.keys(OAUTH_PROVIDERS).length * 0.9
            );
        });
    });

    describe("getOAuthProvider", () => {
        it("should return provider config for valid configured provider", () => {
            const provider = getOAuthProvider("slack");

            expect(provider.name).toBe("slack");
            expect(provider.displayName).toBe("Slack");
            expect(provider.clientId).toBe("slack-client-id");
            expect(provider.clientSecret).toBe("slack-client-secret");
        });

        it("should return provider config for google", () => {
            const provider = getOAuthProvider("google");

            expect(provider.name).toBe("google");
            expect(provider.clientId).toBe("google-client-id");
        });

        it("should throw error for unknown provider", () => {
            expect(() => getOAuthProvider("unknown-provider")).toThrow(
                "Unknown OAuth provider: unknown-provider"
            );
        });

        it("should throw error for provider without credentials", () => {
            expect(() => getOAuthProvider("microsoft")).toThrow(
                /OAuth provider microsoft is not configured/
            );
        });

        it("should include environment variable hint in error message", () => {
            expect(() => getOAuthProvider("microsoft")).toThrow(/MICROSOFT_CLIENT_ID/);
            expect(() => getOAuthProvider("microsoft")).toThrow(/MICROSOFT_CLIENT_SECRET/);
        });
    });

    describe("listOAuthProviders", () => {
        it("should return array of provider info", () => {
            const providers = listOAuthProviders();

            expect(Array.isArray(providers)).toBe(true);
            expect(providers.length).toBeGreaterThan(0);
        });

        it("should include name, displayName, scopes, and configured status", () => {
            const providers = listOAuthProviders();

            providers.forEach((provider) => {
                expect(provider).toHaveProperty("name");
                expect(provider).toHaveProperty("displayName");
                expect(provider).toHaveProperty("scopes");
                expect(provider).toHaveProperty("configured");
                expect(typeof provider.configured).toBe("boolean");
            });
        });

        it("should show configured: true for providers with credentials", () => {
            const providers = listOAuthProviders();
            const slackProvider = providers.find((p) => p.name === "slack");

            expect(slackProvider).toBeDefined();
            expect(slackProvider!.configured).toBe(true);
        });

        it("should show configured: false for providers without credentials", () => {
            const providers = listOAuthProviders();
            const microsoftProvider = providers.find((p) => p.name === "microsoft");

            expect(microsoftProvider).toBeDefined();
            expect(microsoftProvider!.configured).toBe(false);
        });

        it("should not expose client secrets", () => {
            const providers = listOAuthProviders();

            providers.forEach((provider) => {
                expect(provider).not.toHaveProperty("clientId");
                expect(provider).not.toHaveProperty("clientSecret");
                expect(provider).not.toHaveProperty("authUrl");
                expect(provider).not.toHaveProperty("tokenUrl");
            });
        });
    });

    describe("isProviderConfigured", () => {
        it("should return true for configured provider", () => {
            expect(isProviderConfigured("slack")).toBe(true);
            expect(isProviderConfigured("google")).toBe(true);
            expect(isProviderConfigured("github")).toBe(true);
        });

        it("should return false for provider without credentials", () => {
            expect(isProviderConfigured("microsoft")).toBe(false);
            expect(isProviderConfigured("trello")).toBe(false);
        });

        it("should return false for unknown provider", () => {
            expect(isProviderConfigured("unknown-provider")).toBe(false);
            expect(isProviderConfigured("")).toBe(false);
        });
    });
});
