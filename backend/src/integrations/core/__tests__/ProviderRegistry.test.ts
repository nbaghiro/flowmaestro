/**
 * ProviderRegistry Unit Tests
 *
 * Tests for provider registration, lazy loading, caching, and discovery.
 */

import { ProviderRegistry } from "../ProviderRegistry";
import type { IProvider, ProviderRegistryEntry, ProviderCapabilities } from "../types";

// Mock provider implementation for testing
function createMockProvider(name: string, overrides: Partial<IProvider> = {}): IProvider {
    return {
        name,
        displayName: `${name} Display Name`,
        authMethod: "oauth2",
        capabilities: {
            supportsWebhooks: true,
            prefersMCP: false
        } as ProviderCapabilities,
        getAuthConfig: () => ({
            authUrl: "https://example.com/auth",
            tokenUrl: "https://example.com/token",
            scopes: ["read", "write"],
            clientId: "test-client-id",
            clientSecret: "test-client-secret",
            redirectUri: "https://example.com/callback"
        }),
        getOperations: () => [],
        getOperationSchema: () => null,
        getMCPTools: () => [],
        executeOperation: jest.fn().mockResolvedValue({ success: true, data: {} }),
        executeMCPTool: jest.fn().mockResolvedValue({}),
        getTriggers: () => [],
        getWebhookConfig: () => null,
        ...overrides
    } as IProvider;
}

describe("ProviderRegistry", () => {
    let registry: ProviderRegistry;

    beforeEach(() => {
        registry = new ProviderRegistry();
    });

    describe("register", () => {
        it("registers a provider entry", () => {
            const entry: ProviderRegistryEntry = {
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            };

            registry.register(entry);

            expect(registry.getRegisteredProviders()).toContain("slack");
        });

        it("allows registering multiple providers", () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            });
            registry.register({
                name: "github",
                displayName: "GitHub",
                authMethod: "oauth2",
                category: "developer-tools",
                loader: async () => createMockProvider("github")
            });

            const providers = registry.getRegisteredProviders();
            expect(providers).toContain("slack");
            expect(providers).toContain("github");
            expect(providers).toHaveLength(2);
        });

        it("overwrites existing provider with same name", () => {
            const loader1 = jest.fn().mockResolvedValue(createMockProvider("slack"));
            const loader2 = jest.fn().mockResolvedValue(createMockProvider("slack"));

            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: loader1
            });
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "productivity",
                loader: loader2
            });

            expect(registry.getRegisteredProviders()).toHaveLength(1);
        });
    });

    describe("loadProvider", () => {
        it("loads a registered provider", async () => {
            const mockProvider = createMockProvider("slack");
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => mockProvider
            });

            const provider = await registry.loadProvider("slack");

            expect(provider).toBe(mockProvider);
            expect(provider.name).toBe("slack");
        });

        it("throws error for unregistered provider", async () => {
            await expect(registry.loadProvider("nonexistent")).rejects.toThrow(
                "Provider nonexistent not found in registry"
            );
        });

        it("caches loaded providers", async () => {
            const loader = jest.fn().mockResolvedValue(createMockProvider("slack"));
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader
            });

            await registry.loadProvider("slack");
            await registry.loadProvider("slack");
            await registry.loadProvider("slack");

            expect(loader).toHaveBeenCalledTimes(1);
        });

        it("handles loader errors gracefully", async () => {
            registry.register({
                name: "broken",
                displayName: "Broken",
                authMethod: "oauth2",
                category: "test",
                loader: async () => {
                    throw new Error("Failed to initialize");
                }
            });

            await expect(registry.loadProvider("broken")).rejects.toThrow(
                "Failed to load provider broken: Failed to initialize"
            );
        });
    });

    describe("getProvider", () => {
        it("returns loaded provider", async () => {
            const mockProvider = createMockProvider("slack");
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => mockProvider
            });

            await registry.loadProvider("slack");
            const provider = registry.getProvider("slack");

            expect(provider).toBe(mockProvider);
        });

        it("throws error if provider not loaded", () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            });

            expect(() => registry.getProvider("slack")).toThrow(
                "Provider slack not loaded. Call loadProvider() first."
            );
        });

        it("throws error for unregistered provider", () => {
            expect(() => registry.getProvider("nonexistent")).toThrow(
                "Provider nonexistent not loaded. Call loadProvider() first."
            );
        });
    });

    describe("isLoaded", () => {
        it("returns false for unloaded provider", () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            });

            expect(registry.isLoaded("slack")).toBe(false);
        });

        it("returns true for loaded provider", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            });

            await registry.loadProvider("slack");

            expect(registry.isLoaded("slack")).toBe(true);
        });

        it("returns false for unregistered provider", () => {
            expect(registry.isLoaded("nonexistent")).toBe(false);
        });
    });

    describe("getRegisteredProviders", () => {
        it("returns empty array when no providers registered", () => {
            expect(registry.getRegisteredProviders()).toEqual([]);
        });

        it("returns all registered provider names", () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            });
            registry.register({
                name: "github",
                displayName: "GitHub",
                authMethod: "oauth2",
                category: "developer-tools",
                loader: async () => createMockProvider("github")
            });
            registry.register({
                name: "airtable",
                displayName: "Airtable",
                authMethod: "oauth2",
                category: "productivity",
                loader: async () => createMockProvider("airtable")
            });

            const providers = registry.getRegisteredProviders();
            expect(providers).toHaveLength(3);
            expect(providers).toContain("slack");
            expect(providers).toContain("github");
            expect(providers).toContain("airtable");
        });
    });

    describe("getProviderSummaries", () => {
        it("returns summaries for all providers", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        displayName: "Slack",
                        getOperations: () => [
                            { id: "sendMessage", name: "Send Message" } as never,
                            { id: "listChannels", name: "List Channels" } as never
                        ]
                    })
            });

            const summaries = await registry.getProviderSummaries();

            expect(summaries).toHaveLength(1);
            expect(summaries[0]).toMatchObject({
                name: "slack",
                displayName: "Slack",
                category: "communication",
                operationCount: 2
            });
        });

        it("includes trigger info when available", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        getTriggers: () => [
                            {
                                id: "message_posted",
                                name: "Message Posted",
                                description: "Triggered when a message is posted",
                                configFields: []
                            }
                        ],
                        getWebhookConfig: () => ({
                            setupType: "automatic" as const,
                            signatureType: "hmac_sha256" as const,
                            signatureHeader: "x-slack-signature"
                        })
                    })
            });

            const summaries = await registry.getProviderSummaries();

            expect(summaries[0].triggers).toHaveLength(1);
            expect(summaries[0].triggers![0].id).toBe("message_posted");
            expect(summaries[0].webhookConfig).toBeDefined();
        });
    });

    describe("getTriggerProviders", () => {
        it("returns only providers with triggers", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        getTriggers: () => [
                            {
                                id: "message_posted",
                                name: "Message Posted",
                                description: "Triggered when a message is posted",
                                configFields: []
                            }
                        ]
                    })
            });
            registry.register({
                name: "github",
                displayName: "GitHub",
                authMethod: "oauth2",
                category: "developer-tools",
                loader: async () =>
                    createMockProvider("github", {
                        getTriggers: () => [] // No triggers
                    })
            });

            const triggerProviders = await registry.getTriggerProviders();

            expect(triggerProviders).toHaveLength(1);
            expect(triggerProviders[0].providerId).toBe("slack");
        });

        it("returns empty array when no providers have triggers", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        getTriggers: () => []
                    })
            });

            const triggerProviders = await registry.getTriggerProviders();

            expect(triggerProviders).toEqual([]);
        });
    });

    describe("getTriggerProvider", () => {
        it("returns trigger provider by ID", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        displayName: "Slack",
                        getTriggers: () => [
                            {
                                id: "message_posted",
                                name: "Message Posted",
                                description: "Triggered when a message is posted",
                                configFields: []
                            }
                        ]
                    })
            });

            const provider = await registry.getTriggerProvider("slack");

            expect(provider).toBeDefined();
            expect(provider?.providerId).toBe("slack");
            expect(provider?.name).toBe("Slack");
        });

        it("returns undefined for non-trigger provider", async () => {
            registry.register({
                name: "github",
                displayName: "GitHub",
                authMethod: "oauth2",
                category: "developer-tools",
                loader: async () =>
                    createMockProvider("github", {
                        getTriggers: () => []
                    })
            });

            const provider = await registry.getTriggerProvider("github");

            expect(provider).toBeUndefined();
        });

        it("returns undefined for unregistered provider", async () => {
            const provider = await registry.getTriggerProvider("nonexistent");

            expect(provider).toBeUndefined();
        });
    });

    describe("clear", () => {
        it("clears all loaded providers", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () => createMockProvider("slack")
            });
            await registry.loadProvider("slack");

            expect(registry.isLoaded("slack")).toBe(true);

            registry.clear();

            expect(registry.isLoaded("slack")).toBe(false);
        });

        it("allows reloading after clear", async () => {
            const loader = jest.fn().mockResolvedValue(createMockProvider("slack"));
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader
            });

            await registry.loadProvider("slack");
            registry.clear();
            await registry.loadProvider("slack");

            expect(loader).toHaveBeenCalledTimes(2);
        });
    });

    describe("getWebhookUrl", () => {
        it("generates webhook URL with provider", () => {
            const url = registry.getWebhookUrl("https://api.example.com", "trigger-123", "slack");
            expect(url).toBe("https://api.example.com/webhooks/provider/slack/trigger-123");
        });

        it("generates webhook URL without provider", () => {
            const url = registry.getWebhookUrl("https://api.example.com", "trigger-123");
            expect(url).toBe("https://api.example.com/webhooks/trigger-123");
        });
    });

    describe("verifyWebhookSignature", () => {
        it("verifies signature using provider method", async () => {
            const verifyFn = jest.fn().mockReturnValue({ valid: true });
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        verifyWebhookSignature: verifyFn
                    })
            });

            const result = await registry.verifyWebhookSignature("slack", "secret", {
                headers: { "x-signature": "abc123" },
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });

            expect(result.valid).toBe(true);
            expect(verifyFn).toHaveBeenCalled();
        });

        it("returns valid when provider has no verification method", async () => {
            registry.register({
                name: "simple",
                displayName: "Simple",
                authMethod: "oauth2",
                category: "test",
                loader: async () =>
                    createMockProvider("simple", {
                        verifyWebhookSignature: undefined
                    })
            });

            const result = await registry.verifyWebhookSignature("simple", "secret", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });

            expect(result.valid).toBe(true);
        });

        it("returns invalid for unregistered provider", async () => {
            const result = await registry.verifyWebhookSignature("nonexistent", "secret", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });

            expect(result.valid).toBe(false);
            expect(result.error).toContain("nonexistent");
        });
    });

    describe("extractEventType", () => {
        it("extracts event type using provider method", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        extractEventType: () => "message_posted"
                    })
            });

            const eventType = await registry.extractEventType("slack", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });

            expect(eventType).toBe("message_posted");
        });

        it("falls back to header extraction", async () => {
            registry.register({
                name: "github",
                displayName: "GitHub",
                authMethod: "oauth2",
                category: "developer-tools",
                loader: async () =>
                    createMockProvider("github", {
                        extractEventType: undefined,
                        getWebhookConfig: () => ({
                            setupType: "automatic" as const,
                            signatureType: "hmac_sha256" as const,
                            eventHeader: "X-GitHub-Event"
                        })
                    })
            });

            const eventType = await registry.extractEventType("github", {
                headers: { "X-GitHub-Event": "push" },
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });

            expect(eventType).toBe("push");
        });

        it("returns undefined for unregistered provider", async () => {
            const eventType = await registry.extractEventType("nonexistent", {
                headers: {},
                body: Buffer.from("test"),
                rawBody: Buffer.from("test")
            });

            expect(eventType).toBeUndefined();
        });
    });

    describe("requiresWebhookRegistration", () => {
        it("returns true for automatic setup type", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        getWebhookConfig: () => ({
                            setupType: "automatic" as const,
                            signatureType: "hmac_sha256" as const
                        })
                    })
            });

            const requires = await registry.requiresWebhookRegistration("slack");

            expect(requires).toBe(true);
        });

        it("returns false for manual setup type", async () => {
            registry.register({
                name: "github",
                displayName: "GitHub",
                authMethod: "oauth2",
                category: "developer-tools",
                loader: async () =>
                    createMockProvider("github", {
                        getWebhookConfig: () => ({
                            setupType: "manual" as const,
                            signatureType: "hmac_sha256" as const
                        })
                    })
            });

            const requires = await registry.requiresWebhookRegistration("github");

            expect(requires).toBe(false);
        });

        it("returns false for unregistered provider", async () => {
            const requires = await registry.requiresWebhookRegistration("nonexistent");

            expect(requires).toBe(false);
        });
    });

    describe("usesPolling", () => {
        it("returns true for polling setup type", async () => {
            registry.register({
                name: "twitter",
                displayName: "Twitter",
                authMethod: "oauth2",
                category: "social",
                loader: async () =>
                    createMockProvider("twitter", {
                        getWebhookConfig: () => ({
                            setupType: "polling" as const,
                            signatureType: "none" as const
                        })
                    })
            });

            const usesPolling = await registry.usesPolling("twitter");

            expect(usesPolling).toBe(true);
        });

        it("returns false for webhook-based provider", async () => {
            registry.register({
                name: "slack",
                displayName: "Slack",
                authMethod: "oauth2",
                category: "communication",
                loader: async () =>
                    createMockProvider("slack", {
                        getWebhookConfig: () => ({
                            setupType: "automatic" as const,
                            signatureType: "hmac_sha256" as const
                        })
                    })
            });

            const usesPolling = await registry.usesPolling("slack");

            expect(usesPolling).toBe(false);
        });
    });
});
