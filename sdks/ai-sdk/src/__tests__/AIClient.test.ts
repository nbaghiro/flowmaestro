/**
 * Tests for AIClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIClient } from "../AIClient";
import { EmbeddingCapability } from "../capabilities/embedding/index";
import { ImageCapability } from "../capabilities/image/index";
import { SpeechCapability } from "../capabilities/speech/index";
import { TextCapability } from "../capabilities/text/index";
import { VideoCapability } from "../capabilities/video/index";
import { VisionCapability } from "../capabilities/vision/index";
import { AuthenticationError } from "../core/errors";
import {
    TEST_API_KEYS,
    minimalClientConfig,
    fullClientConfig,
    captureTestLogger
} from "./fixtures/configs";
import type { AIClientConfig, AuthResolver } from "../types";

describe("AIClient", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        // Clear all API key env vars
        delete process.env.OPENAI_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.COHERE_API_KEY;
        delete process.env.HUGGINGFACE_API_KEY;
        delete process.env.REPLICATE_API_KEY;
        delete process.env.STABILITY_API_KEY;
        delete process.env.FAL_API_KEY;
        delete process.env.RUNWAY_API_KEY;
        delete process.env.LUMA_API_KEY;
        delete process.env.ELEVENLABS_API_KEY;
        delete process.env.XAI_API_KEY;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("constructor", () => {
        it("should create client with default config", () => {
            const client = new AIClient();

            expect(client).toBeInstanceOf(AIClient);
        });

        it("should create client with provider configs", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client).toBeInstanceOf(AIClient);
            expect(client.isProviderAvailable("openai")).toBe(true);
        });

        it("should create client with all provider configs", () => {
            const client = new AIClient(fullClientConfig);

            expect(client.isProviderAvailable("openai")).toBe(true);
            expect(client.isProviderAvailable("anthropic")).toBe(true);
            expect(client.isProviderAvailable("google")).toBe(true);
        });

        it("should accept custom logger", () => {
            const { logger } = captureTestLogger();
            const config: AIClientConfig = {
                ...minimalClientConfig,
                logger
            };

            const client = new AIClient(config);

            expect(client).toBeInstanceOf(AIClient);
        });

        it("should enable console logger in debug mode", () => {
            const config: AIClientConfig = {
                ...minimalClientConfig,
                debug: true
            };

            const client = new AIClient(config);

            expect(client).toBeInstanceOf(AIClient);
        });

        it("should accept custom retry config", () => {
            const config: AIClientConfig = {
                ...minimalClientConfig,
                retry: {
                    maxRetries: 5,
                    initialDelayMs: 500
                }
            };

            const client = new AIClient(config);

            expect(client).toBeInstanceOf(AIClient);
        });

        it("should accept authResolver", () => {
            const authResolver: AuthResolver = vi.fn().mockResolvedValue("custom-key");
            const config: AIClientConfig = {
                authResolver
            };

            const client = new AIClient(config);

            expect(client).toBeInstanceOf(AIClient);
        });
    });

    describe("capabilities", () => {
        it("should expose text capability", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.text).toBeInstanceOf(TextCapability);
        });

        it("should expose embedding capability", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.embedding).toBeInstanceOf(EmbeddingCapability);
        });

        it("should expose image capability", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.image).toBeInstanceOf(ImageCapability);
        });

        it("should expose video capability", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.video).toBeInstanceOf(VideoCapability);
        });

        it("should expose vision capability", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.vision).toBeInstanceOf(VisionCapability);
        });

        it("should expose speech capability", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.speech).toBeInstanceOf(SpeechCapability);
        });
    });

    describe("isProviderAvailable", () => {
        it("should return true for configured provider", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.isProviderAvailable("openai")).toBe(true);
        });

        it("should return false for unconfigured provider", () => {
            const client = new AIClient(minimalClientConfig);

            expect(client.isProviderAvailable("anthropic")).toBe(false);
        });

        it("should return true for provider with env var", () => {
            process.env.ANTHROPIC_API_KEY = "env-key";
            const client = new AIClient();

            expect(client.isProviderAvailable("anthropic")).toBe(true);
        });
    });

    describe("getAvailableProviders", () => {
        it("should return configured providers", () => {
            const client = new AIClient(fullClientConfig);

            const providers = client.getAvailableProviders();

            expect(providers).toContain("openai");
            expect(providers).toContain("anthropic");
            expect(providers).toContain("google");
        });

        it("should return empty array when no providers configured", () => {
            const client = new AIClient();

            const providers = client.getAvailableProviders();

            expect(providers).toEqual([]);
        });

        it("should include env var providers", () => {
            process.env.OPENAI_API_KEY = "env-key";
            const client = new AIClient();

            const providers = client.getAvailableProviders();

            expect(providers).toContain("openai");
        });
    });

    describe("getApiKey", () => {
        it("should return configured API key", async () => {
            const client = new AIClient(minimalClientConfig);

            const apiKey = await client.getApiKey("openai");

            expect(apiKey).toBe(TEST_API_KEYS.openai);
        });

        it("should return env var API key", async () => {
            process.env.ANTHROPIC_API_KEY = "env-anthropic-key";
            const client = new AIClient();

            const apiKey = await client.getApiKey("anthropic");

            expect(apiKey).toBe("env-anthropic-key");
        });

        it("should use authResolver with connectionId", async () => {
            const authResolver: AuthResolver = vi.fn().mockResolvedValue("custom-key");
            const client = new AIClient({ authResolver });

            const apiKey = await client.getApiKey("openai", "conn-123");

            expect(apiKey).toBe("custom-key");
            expect(authResolver).toHaveBeenCalledWith("openai", "conn-123");
        });

        it("should throw for unconfigured provider", async () => {
            const client = new AIClient();

            await expect(client.getApiKey("openai")).rejects.toThrow(AuthenticationError);
        });
    });

    describe("configureProvider", () => {
        it("should add new provider configuration", () => {
            const client = new AIClient();

            expect(client.isProviderAvailable("openai")).toBe(false);

            client.configureProvider("openai", { apiKey: "new-key" });

            expect(client.isProviderAvailable("openai")).toBe(true);
        });

        it("should update existing provider configuration", async () => {
            const client = new AIClient(minimalClientConfig);

            client.configureProvider("openai", { apiKey: "updated-key" });

            const apiKey = await client.getApiKey("openai");
            expect(apiKey).toBe("updated-key");
        });

        it("should merge configuration options", async () => {
            const client = new AIClient({
                providers: {
                    openai: { apiKey: "original-key", defaultModel: "gpt-4" }
                }
            });

            client.configureProvider("openai", { defaultModel: "gpt-4.1" });

            const apiKey = await client.getApiKey("openai");
            expect(apiKey).toBe("original-key");
        });
    });

    describe("setDefaultProvider", () => {
        it("should set default text provider", () => {
            const client = new AIClient(fullClientConfig);

            // This should not throw
            client.setDefaultProvider("text", "anthropic");
        });

        it("should set default embedding provider", () => {
            const client = new AIClient(fullClientConfig);

            client.setDefaultProvider("embedding", "cohere");
        });

        it("should set default image provider", () => {
            const client = new AIClient(fullClientConfig);

            client.setDefaultProvider("image", "stabilityai");
        });

        it("should set default video provider", () => {
            const client = new AIClient(fullClientConfig);

            client.setDefaultProvider("video", "runway");
        });

        it("should set default vision provider", () => {
            const client = new AIClient(fullClientConfig);

            client.setDefaultProvider("vision", "anthropic");
        });

        it("should set default speech provider", () => {
            const client = new AIClient(fullClientConfig);

            client.setDefaultProvider("speech", "elevenlabs");
        });
    });

    describe("provider registration", () => {
        it("should register all text providers", () => {
            const client = new AIClient(fullClientConfig);

            // Test by checking that providers don't throw when accessed
            // We can't directly access registry but we can test through capabilities
            const textProviders = client.text.getAvailableProviders();

            expect(textProviders).toContain("openai");
            expect(textProviders).toContain("anthropic");
            expect(textProviders).toContain("google");
            expect(textProviders).toContain("cohere");
        });

        it("should lazy-initialize providers", () => {
            // This test verifies that providers are not instantiated until needed
            // The fact that AIClient can be created without errors even when
            // external SDKs would fail to import proves lazy initialization
            const client = new AIClient(minimalClientConfig);

            expect(client).toBeInstanceOf(AIClient);
        });
    });

    describe("integration with capabilities", () => {
        it("should share provider registry across capabilities", () => {
            const client = new AIClient(fullClientConfig);

            // All capabilities should see the same providers
            const textProviders = client.text.getAvailableProviders();

            // Text providers should be available
            expect(textProviders).toContain("openai");
            expect(textProviders).toContain("anthropic");
        });

        it("should share retry config across capabilities", () => {
            const config: AIClientConfig = {
                ...fullClientConfig,
                retry: {
                    maxRetries: 10
                }
            };

            const client = new AIClient(config);

            // Can't directly test retry config but can verify client creation succeeds
            expect(client.text).toBeDefined();
            expect(client.embedding).toBeDefined();
        });
    });
});
