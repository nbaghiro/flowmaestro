/**
 * Tests for TextCapability
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    TEST_API_KEYS,
    fastRetryConfig,
    silentTestLogger,
    captureTestLogger,
    testTextCompletionRequest
} from "../../../__tests__/fixtures/configs";
import { RateLimitError, AuthenticationError } from "../../../core/errors";
import { ProviderRegistry } from "../../../providers/registry";
import { TextCapability } from "../index";
import type { TextCompletionProvider } from "../../../providers/base";
import type { TextCompletionResponse, TextCompletionStream } from "../types";

// Mock provider for testing
function createMockTextProvider(
    overrides?: Partial<TextCompletionProvider>
): TextCompletionProvider {
    return {
        provider: "openai",
        supportedModels: ["gpt-4.1", "gpt-4o"],
        supportsModel: vi.fn().mockReturnValue(true),
        supportsThinking: vi.fn().mockReturnValue(false),
        complete: vi.fn().mockResolvedValue({
            text: "Hello! How can I help you?",
            metadata: {
                processingTimeMs: 100,
                provider: "openai",
                model: "gpt-4.1",
                usage: { promptTokens: 10, completionTokens: 9, totalTokens: 19 }
            }
        } as TextCompletionResponse),
        stream: vi.fn().mockResolvedValue(createMockStream()),
        ...overrides
    };
}

function createMockStream(): TextCompletionStream {
    let index = 0;
    const tokens = ["Hello", "!", " How", " can", " I", " help", "?"];

    return {
        [Symbol.asyncIterator]: () => ({
            next: async () => {
                if (index < tokens.length) {
                    return { value: tokens[index++], done: false };
                }
                return { value: undefined, done: true };
            }
        }),
        getResponse: () =>
            Promise.resolve({
                text: tokens.join(""),
                metadata: {
                    processingTimeMs: 200,
                    provider: "openai",
                    model: "gpt-4.1"
                }
            })
    } as TextCompletionStream;
}

describe("TextCapability", () => {
    let registry: ProviderRegistry;
    let capability: TextCapability;
    let mockProvider: TextCompletionProvider;

    beforeEach(() => {
        registry = new ProviderRegistry({
            providers: { openai: { apiKey: TEST_API_KEYS.openai } },
            logger: silentTestLogger
        });

        mockProvider = createMockTextProvider();

        registry.registerTextProvider("openai", () => mockProvider);
        registry.setDefaultProvider("text", "openai");

        capability = new TextCapability(registry, fastRetryConfig, silentTestLogger);
    });

    describe("complete", () => {
        it("should call provider complete method", async () => {
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            const response = await capability.complete(request);

            expect(mockProvider.complete).toHaveBeenCalledWith(request, TEST_API_KEYS.openai);
            expect(response.text).toBe("Hello! How can I help you?");
        });

        it("should use default provider when not specified", async () => {
            const request = { model: "gpt-4.1", prompt: "Hello" };

            await capability.complete(request);

            expect(mockProvider.complete).toHaveBeenCalled();
        });

        it("should resolve API key from registry", async () => {
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            await capability.complete(request);

            expect(mockProvider.complete).toHaveBeenCalledWith(
                expect.anything(),
                TEST_API_KEYS.openai
            );
        });

        it("should include connection ID in API key resolution", async () => {
            const resolveApiKeySpy = vi.spyOn(registry, "resolveApiKey");
            const request = {
                ...testTextCompletionRequest,
                provider: "openai" as const,
                connectionId: "conn-123"
            };

            await capability.complete(request);

            expect(resolveApiKeySpy).toHaveBeenCalledWith("openai", "conn-123");
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new TextCapability(registry, fastRetryConfig, logger);

            await capability.complete({
                ...testTextCompletionRequest,
                provider: "openai" as const
            });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Text completion request")).toBe(true);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.complete = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue({
                    text: "Success after retry",
                    metadata: { processingTimeMs: 100, provider: "openai", model: "gpt-4.1" }
                });

            const resultPromise = capability.complete({
                ...testTextCompletionRequest,
                provider: "openai" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.text).toBe("Success after retry");
            expect(mockProvider.complete).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });

        it("should not retry non-retryable errors", async () => {
            mockProvider.complete = vi
                .fn()
                .mockRejectedValue(new AuthenticationError("openai", "Invalid key"));

            await expect(
                capability.complete({ ...testTextCompletionRequest, provider: "openai" as const })
            ).rejects.toThrow(AuthenticationError);

            expect(mockProvider.complete).toHaveBeenCalledTimes(1);
        });

        it("should handle system prompt in request", async () => {
            const request = {
                ...testTextCompletionRequest,
                provider: "openai" as const,
                systemPrompt: "You are a helpful assistant."
            };

            await capability.complete(request);

            expect(mockProvider.complete).toHaveBeenCalledWith(
                expect.objectContaining({ systemPrompt: "You are a helpful assistant." }),
                expect.anything()
            );
        });

        it("should handle message array prompt", async () => {
            const request = {
                model: "gpt-4.1",
                provider: "openai" as const,
                prompt: [
                    { role: "user" as const, content: "Hello" },
                    { role: "assistant" as const, content: "Hi!" },
                    { role: "user" as const, content: "How are you?" }
                ]
            };

            await capability.complete(request);

            expect(mockProvider.complete).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: expect.arrayContaining([
                        expect.objectContaining({ role: "user", content: "Hello" })
                    ])
                }),
                expect.anything()
            );
        });
    });

    describe("stream", () => {
        it("should return async iterator", async () => {
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            const stream = await capability.stream(request);

            const tokens: string[] = [];
            for await (const token of stream) {
                tokens.push(token);
            }

            expect(tokens.length).toBeGreaterThan(0);
            expect(mockProvider.stream).toHaveBeenCalled();
        });

        it("should allow getting full response after streaming", async () => {
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            const stream = await capability.stream(request);

            // Consume stream first
            for await (const _ of stream) {
                // consume
            }

            const response = await stream.getResponse();

            expect(response.text).toBeDefined();
            expect(response.metadata).toBeDefined();
        });

        it("should log stream request", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new TextCapability(registry, fastRetryConfig, logger);

            await capability.stream({ ...testTextCompletionRequest, provider: "openai" as const });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Text completion stream request")).toBe(true);
        });
    });

    describe("completeWithCallbacks", () => {
        it("should call onToken for each token", async () => {
            const onToken = vi.fn();
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            await capability.completeWithCallbacks(request, { onToken });

            expect(onToken).toHaveBeenCalled();
            expect(onToken.mock.calls.length).toBeGreaterThan(0);
        });

        it("should call onComplete with final response", async () => {
            const onComplete = vi.fn();
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            const response = await capability.completeWithCallbacks(request, { onComplete });

            expect(onComplete).toHaveBeenCalledWith(response);
        });

        it("should call onError when stream fails", async () => {
            const error = new Error("Stream error");
            mockProvider.stream = vi.fn().mockResolvedValue({
                [Symbol.asyncIterator]: () => ({
                    next: () => Promise.reject(error)
                }),
                getResponse: () => Promise.reject(error)
            });

            const onError = vi.fn();
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            await expect(capability.completeWithCallbacks(request, { onError })).rejects.toThrow(
                "Stream error"
            );

            expect(onError).toHaveBeenCalledWith(error);
        });

        it("should call onThinkingComplete when thinking is present", async () => {
            mockProvider.stream = vi.fn().mockResolvedValue({
                [Symbol.asyncIterator]: () => ({
                    next: async function () {
                        return { value: undefined, done: true };
                    }
                }),
                getResponse: () =>
                    Promise.resolve({
                        text: "Response",
                        thinking: "I thought about this...",
                        metadata: { processingTimeMs: 100, provider: "openai", model: "gpt-4.1" }
                    })
            });

            const onThinkingComplete = vi.fn();
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            await capability.completeWithCallbacks(request, { onThinkingComplete });

            expect(onThinkingComplete).toHaveBeenCalledWith("I thought about this...");
        });

        it("should return final response", async () => {
            const request = { ...testTextCompletionRequest, provider: "openai" as const };

            const response = await capability.completeWithCallbacks(request, {});

            expect(response.text).toBeDefined();
            expect(response.metadata).toBeDefined();
        });
    });

    describe("supportsThinking", () => {
        it("should return true for thinking-capable models", () => {
            mockProvider.supportsThinking = vi.fn().mockReturnValue(true);

            expect(capability.supportsThinking("openai", "o3")).toBe(true);
            expect(mockProvider.supportsThinking).toHaveBeenCalledWith("o3");
        });

        it("should return false for non-thinking models", () => {
            mockProvider.supportsThinking = vi.fn().mockReturnValue(false);

            expect(capability.supportsThinking("openai", "gpt-4.1")).toBe(false);
        });

        it("should return false when provider not found", () => {
            expect(capability.supportsThinking("unknown" as "openai", "model")).toBe(false);
        });

        it("should return false when provider throws", () => {
            mockProvider.supportsThinking = vi.fn().mockImplementation(() => {
                throw new Error("Provider error");
            });

            expect(capability.supportsThinking("openai", "model")).toBe(false);
        });
    });

    describe("getAvailableProviders", () => {
        it("should return list of available text providers", () => {
            const providers = capability.getAvailableProviders();

            expect(providers).toContain("openai");
        });

        it("should only return providers with API keys", () => {
            // Register another provider without API key
            registry.registerTextProvider("anthropic", () => createMockTextProvider());

            const providers = capability.getAvailableProviders();

            expect(providers).toContain("openai");
            expect(providers).not.toContain("anthropic");
        });
    });
});
