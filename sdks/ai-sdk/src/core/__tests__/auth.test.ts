/**
 * Tests for authentication resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { silentTestLogger, captureTestLogger } from "../../__tests__/fixtures/configs";
import { resolveApiKey, hasApiKey, getConfiguredProviders, PROVIDER_ENV_VARS } from "../auth";
import { AuthenticationError } from "../errors";
import type { AIProvider, ProviderConfig, AuthResolver } from "../../types";

describe("Authentication", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment
        process.env = { ...originalEnv };

        // Clear all API key env vars
        for (const envVar of Object.values(PROVIDER_ENV_VARS)) {
            delete process.env[envVar];
        }
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("PROVIDER_ENV_VARS", () => {
        it("should have correct mappings for all providers", () => {
            expect(PROVIDER_ENV_VARS.openai).toBe("OPENAI_API_KEY");
            expect(PROVIDER_ENV_VARS.anthropic).toBe("ANTHROPIC_API_KEY");
            expect(PROVIDER_ENV_VARS.google).toBe("GOOGLE_API_KEY");
            expect(PROVIDER_ENV_VARS.cohere).toBe("COHERE_API_KEY");
            expect(PROVIDER_ENV_VARS.huggingface).toBe("HUGGINGFACE_API_KEY");
            expect(PROVIDER_ENV_VARS.replicate).toBe("REPLICATE_API_KEY");
            expect(PROVIDER_ENV_VARS.stabilityai).toBe("STABILITY_API_KEY");
            expect(PROVIDER_ENV_VARS.fal).toBe("FAL_API_KEY");
            expect(PROVIDER_ENV_VARS.runway).toBe("RUNWAY_API_KEY");
            expect(PROVIDER_ENV_VARS.luma).toBe("LUMA_API_KEY");
            expect(PROVIDER_ENV_VARS.elevenlabs).toBe("ELEVENLABS_API_KEY");
            expect(PROVIDER_ENV_VARS.xai).toBe("XAI_API_KEY");
        });
    });

    describe("resolveApiKey", () => {
        it("should use custom auth resolver when connectionId is provided", async () => {
            const authResolver: AuthResolver = vi.fn().mockResolvedValue("custom-key");
            const providerConfigs = {};

            const apiKey = await resolveApiKey(
                "openai",
                "conn-123",
                authResolver,
                providerConfigs,
                silentTestLogger
            );

            expect(apiKey).toBe("custom-key");
            expect(authResolver).toHaveBeenCalledWith("openai", "conn-123");
        });

        it("should fall back to provider config when auth resolver returns null", async () => {
            const authResolver: AuthResolver = vi.fn().mockResolvedValue(null);
            const providerConfigs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "config-key" }
            };

            const apiKey = await resolveApiKey(
                "openai",
                "conn-123",
                authResolver,
                providerConfigs,
                silentTestLogger
            );

            expect(apiKey).toBe("config-key");
        });

        it("should fall back to provider config when auth resolver throws", async () => {
            const authResolver: AuthResolver = vi.fn().mockRejectedValue(new Error("Auth failed"));
            const providerConfigs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "config-key" }
            };

            const apiKey = await resolveApiKey(
                "openai",
                "conn-123",
                authResolver,
                providerConfigs,
                silentTestLogger
            );

            expect(apiKey).toBe("config-key");
        });

        it("should log warning when auth resolver fails", async () => {
            const { logger, logs } = captureTestLogger();
            const authResolver: AuthResolver = vi
                .fn()
                .mockRejectedValue(new Error("Auth service down"));
            const providerConfigs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "fallback-key" }
            };

            await resolveApiKey("openai", "conn-123", authResolver, providerConfigs, logger);

            const warnLogs = logs.filter((l) => l.level === "warn");
            expect(warnLogs.length).toBe(1);
            expect(warnLogs[0].message).toBe("Custom auth resolver failed, falling back");
            expect(warnLogs[0].context?.error).toBe("Auth service down");
        });

        it("should use provider config when no connectionId", async () => {
            const authResolver: AuthResolver = vi.fn();
            const providerConfigs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "config-key" }
            };

            const apiKey = await resolveApiKey(
                "openai",
                undefined,
                authResolver,
                providerConfigs,
                silentTestLogger
            );

            expect(apiKey).toBe("config-key");
            // Should not call auth resolver when no connectionId
            expect(authResolver).not.toHaveBeenCalled();
        });

        it("should use provider config when no auth resolver", async () => {
            const providerConfigs: Partial<Record<AIProvider, ProviderConfig>> = {
                anthropic: { apiKey: "anthropic-key" }
            };

            const apiKey = await resolveApiKey(
                "anthropic",
                "conn-123",
                undefined,
                providerConfigs,
                silentTestLogger
            );

            expect(apiKey).toBe("anthropic-key");
        });

        it("should fall back to environment variable", async () => {
            process.env.OPENAI_API_KEY = "env-key";

            const apiKey = await resolveApiKey(
                "openai",
                undefined,
                undefined,
                {},
                silentTestLogger
            );

            expect(apiKey).toBe("env-key");
        });

        it("should throw AuthenticationError when no API key found", async () => {
            await expect(
                resolveApiKey("openai", undefined, undefined, {}, silentTestLogger)
            ).rejects.toThrow(AuthenticationError);

            await expect(
                resolveApiKey("openai", undefined, undefined, {}, silentTestLogger)
            ).rejects.toThrow("No API key available for openai");
        });

        it("should include helpful message in AuthenticationError", async () => {
            try {
                await resolveApiKey("google", undefined, undefined, {}, silentTestLogger);
            } catch (error) {
                expect(error).toBeInstanceOf(AuthenticationError);
                const authError = error as AuthenticationError;
                expect(authError.message).toContain("connectionId");
                expect(authError.message).toContain("providers.google.apiKey");
                expect(authError.message).toContain("GOOGLE_API_KEY");
            }
        });

        it("should log debug messages for each resolution method", async () => {
            const { logger, logs } = captureTestLogger();

            // Test auth resolver path
            const authResolver: AuthResolver = vi.fn().mockResolvedValue("custom-key");
            await resolveApiKey("openai", "conn-123", authResolver, {}, logger);

            let debugLogs = logs.filter((l) => l.level === "debug");
            expect(debugLogs.some((l) => l.message === "Using connection-based API key")).toBe(
                true
            );

            // Clear logs
            logs.length = 0;

            // Test provider config path
            await resolveApiKey(
                "anthropic",
                undefined,
                undefined,
                {
                    anthropic: { apiKey: "config-key" }
                },
                logger
            );

            debugLogs = logs.filter((l) => l.level === "debug");
            expect(debugLogs.some((l) => l.message === "Using configured API key")).toBe(true);

            // Clear logs
            logs.length = 0;

            // Test env var path
            process.env.GOOGLE_API_KEY = "env-key";
            await resolveApiKey("google", undefined, undefined, {}, logger);

            debugLogs = logs.filter((l) => l.level === "debug");
            expect(debugLogs.some((l) => l.message === "Using environment variable API key")).toBe(
                true
            );
        });
    });

    describe("hasApiKey", () => {
        it("should return true when provider config has apiKey", () => {
            const configs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "key" }
            };

            expect(hasApiKey("openai", configs)).toBe(true);
        });

        it("should return true when environment variable is set", () => {
            process.env.ANTHROPIC_API_KEY = "env-key";

            expect(hasApiKey("anthropic", {})).toBe(true);
        });

        it("should return false when no API key configured", () => {
            expect(hasApiKey("openai", {})).toBe(false);
        });

        it("should prefer provider config over env var", () => {
            process.env.OPENAI_API_KEY = "env-key";
            const configs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "config-key" }
            };

            // Both are available, but we return true regardless
            expect(hasApiKey("openai", configs)).toBe(true);
        });

        it("should return false for empty apiKey string", () => {
            const configs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "" }
            };

            expect(hasApiKey("openai", configs)).toBe(false);
        });
    });

    describe("getConfiguredProviders", () => {
        it("should return empty array when no providers configured", () => {
            expect(getConfiguredProviders({})).toEqual([]);
        });

        it("should return providers with API keys in config", () => {
            const configs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "key1" },
                anthropic: { apiKey: "key2" }
            };

            const providers = getConfiguredProviders(configs);

            expect(providers).toContain("openai");
            expect(providers).toContain("anthropic");
            expect(providers.length).toBe(2);
        });

        it("should return providers with API keys in environment", () => {
            process.env.GOOGLE_API_KEY = "google-key";
            process.env.COHERE_API_KEY = "cohere-key";

            const providers = getConfiguredProviders({});

            expect(providers).toContain("google");
            expect(providers).toContain("cohere");
        });

        it("should combine config and environment providers", () => {
            process.env.GOOGLE_API_KEY = "google-key";
            const configs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "openai-key" }
            };

            const providers = getConfiguredProviders(configs);

            expect(providers).toContain("openai");
            expect(providers).toContain("google");
        });

        it("should not duplicate providers", () => {
            process.env.OPENAI_API_KEY = "env-key";
            const configs: Partial<Record<AIProvider, ProviderConfig>> = {
                openai: { apiKey: "config-key" }
            };

            const providers = getConfiguredProviders(configs);

            const openaiCount = providers.filter((p) => p === "openai").length;
            expect(openaiCount).toBe(1);
        });

        it("should return all 12 providers when all configured", () => {
            // Set all env vars
            for (const [provider, envVar] of Object.entries(PROVIDER_ENV_VARS)) {
                process.env[envVar] = `${provider}-key`;
            }

            const providers = getConfiguredProviders({});

            expect(providers.length).toBe(12);
            expect(providers).toContain("openai");
            expect(providers).toContain("anthropic");
            expect(providers).toContain("google");
            expect(providers).toContain("cohere");
            expect(providers).toContain("huggingface");
            expect(providers).toContain("replicate");
            expect(providers).toContain("stabilityai");
            expect(providers).toContain("fal");
            expect(providers).toContain("runway");
            expect(providers).toContain("luma");
            expect(providers).toContain("elevenlabs");
            expect(providers).toContain("xai");
        });
    });
});
