/**
 * Tests for OpenAI Text Provider
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { silentTestLogger } from "../../../__tests__/fixtures/configs";
import {
    mockOpenAICompletion,
    mockOpenAICompletionWithReasoning
} from "../../../__tests__/fixtures/responses";
import type { TextCompletionRequest } from "../../../capabilities/text/types";

// Shared mock function - must be defined before vi.mock
const mockCreate = vi.fn();

// Mock OpenAI SDK - using a class that references the shared mock
vi.mock("openai", () => {
    return {
        default: class MockOpenAI {
            chat = {
                completions: {
                    create: mockCreate
                }
            };
        }
    };
});

// Import after mock is set up - must come after vi.mock()
// eslint-disable-next-line import/order
import { OpenAITextProvider } from "../openai";

describe("OpenAITextProvider", () => {
    let provider: OpenAITextProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new OpenAITextProvider(silentTestLogger);
    });

    describe("properties", () => {
        it("should have correct provider name", () => {
            expect(provider.provider).toBe("openai");
        });

        it("should support expected models", () => {
            expect(provider.supportedModels).toContain("gpt-4.1");
            expect(provider.supportedModels).toContain("gpt-4o");
            expect(provider.supportedModels).toContain("gpt-4o-mini");
            expect(provider.supportedModels).toContain("gpt-4-turbo");
            expect(provider.supportedModels).toContain("gpt-3.5-turbo");
            expect(provider.supportedModels).toContain("o3");
            expect(provider.supportedModels).toContain("o1");
        });
    });

    describe("supportsThinking", () => {
        it("should return true for reasoning models", () => {
            expect(provider.supportsThinking("o3")).toBe(true);
            expect(provider.supportsThinking("o3-mini")).toBe(true);
            expect(provider.supportsThinking("o1")).toBe(true);
            expect(provider.supportsThinking("o1-mini")).toBe(true);
            expect(provider.supportsThinking("o1-preview")).toBe(true);
            expect(provider.supportsThinking("o4-mini")).toBe(true);
        });

        it("should return false for standard models", () => {
            expect(provider.supportsThinking("gpt-4.1")).toBe(false);
            expect(provider.supportsThinking("gpt-4o")).toBe(false);
            expect(provider.supportsThinking("gpt-3.5-turbo")).toBe(false);
        });

        it("should match model prefixes", () => {
            expect(provider.supportsThinking("o3-custom")).toBe(true);
            expect(provider.supportsThinking("o1-extended")).toBe(true);
        });
    });

    describe("complete", () => {
        it("should call OpenAI API with correct parameters", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletion);

            const request: TextCompletionRequest = {
                model: "gpt-4.1",
                prompt: "Hello, how are you?",
                maxTokens: 100,
                temperature: 0.7
            };

            const response = await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "gpt-4.1",
                    max_tokens: 100,
                    temperature: 0.7
                })
            );
            expect(response.text).toBe("Hello! How can I help you today?");
        });

        it("should handle system prompt", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletion);

            const request: TextCompletionRequest = {
                model: "gpt-4.1",
                systemPrompt: "You are a helpful assistant.",
                prompt: "Hello"
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "system",
                            content: "You are a helpful assistant."
                        }),
                        expect.objectContaining({ role: "user", content: "Hello" })
                    ])
                })
            );
        });

        it("should handle message array prompt", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletion);

            const request: TextCompletionRequest = {
                model: "gpt-4.1",
                prompt: [
                    { role: "user", content: "Hi!" },
                    { role: "assistant", content: "Hello!" },
                    { role: "user", content: "How are you?" }
                ]
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        { role: "user", content: "Hi!" },
                        { role: "assistant", content: "Hello!" },
                        { role: "user", content: "How are you?" }
                    ]
                })
            );
        });

        it("should merge system prompt with user message for reasoning models", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletionWithReasoning);

            const request: TextCompletionRequest = {
                model: "o3-mini",
                systemPrompt: "You are a math tutor.",
                prompt: "What is 2 + 2?"
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        expect.objectContaining({
                            role: "user",
                            content: expect.stringContaining("You are a math tutor")
                        })
                    ]
                })
            );
        });

        it("should not include temperature for reasoning models", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletionWithReasoning);

            const request: TextCompletionRequest = {
                model: "o3",
                prompt: "Solve this problem",
                temperature: 0.5 // Should be ignored
            };

            await provider.complete(request, "test-api-key");

            const callArgs = mockCreate.mock.calls[0][0];
            expect(callArgs.temperature).toBeUndefined();
        });

        it("should return metadata with usage", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletion);

            const response = await provider.complete(
                { model: "gpt-4.1", prompt: "test" },
                "test-api-key"
            );

            expect(response.metadata.provider).toBe("openai");
            expect(response.metadata.model).toBe("gpt-4.1");
            expect(response.metadata.usage?.promptTokens).toBe(10);
            expect(response.metadata.usage?.completionTokens).toBe(9);
            expect(response.metadata.usage?.totalTokens).toBe(19);
        });

        it("should extract reasoning tokens for o-series models", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletionWithReasoning);

            const response = await provider.complete(
                { model: "o3-mini", prompt: "test" },
                "test-api-key"
            );

            expect(response.metadata.usage?.thinkingTokens).toBe(40);
        });

        it("should handle stop sequences", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletion);

            const request: TextCompletionRequest = {
                model: "gpt-4.1",
                prompt: "test",
                stop: ["END", "STOP"]
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    stop: ["END", "STOP"]
                })
            );
        });

        it("should use default values when not specified", async () => {
            mockCreate.mockResolvedValueOnce(mockOpenAICompletion);

            await provider.complete({ model: "gpt-4.1", prompt: "test" }, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    max_tokens: 1000,
                    temperature: 0.7,
                    top_p: 1
                })
            );
        });
    });

    describe("stream", () => {
        it("should return async iterator", async () => {
            // Create async generator for streaming
            async function* mockStream() {
                yield { id: "chatcmpl-123", choices: [{ delta: { content: "Hello" }, index: 0 }] };
                yield { id: "chatcmpl-123", choices: [{ delta: { content: " World" }, index: 0 }] };
                yield {
                    id: "chatcmpl-123",
                    choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
                    usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 }
                };
            }

            mockCreate.mockResolvedValueOnce(mockStream());

            const stream = await provider.stream(
                { model: "gpt-4.1", prompt: "test" },
                "test-api-key"
            );

            const tokens: string[] = [];
            for await (const token of stream) {
                tokens.push(token);
            }

            expect(tokens).toEqual(["Hello", " World"]);
        });

        it("should allow getting full response after streaming", async () => {
            async function* mockStream() {
                yield { id: "chatcmpl-123", choices: [{ delta: { content: "Test" }, index: 0 }] };
                yield {
                    id: "chatcmpl-123",
                    choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
                    usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 }
                };
            }

            mockCreate.mockResolvedValueOnce(mockStream());

            const stream = await provider.stream(
                { model: "gpt-4.1", prompt: "test" },
                "test-api-key"
            );

            // Consume stream
            for await (const _ of stream) {
                // consume
            }

            const response = await stream.getResponse();

            expect(response.text).toBe("Test");
            expect(response.metadata.provider).toBe("openai");
        });

        it("should call API with stream: true", async () => {
            async function* mockStream() {
                yield {
                    id: "chatcmpl-123",
                    choices: [{ delta: {}, index: 0, finish_reason: "stop" }]
                };
            }

            mockCreate.mockResolvedValueOnce(mockStream());

            await provider.stream({ model: "gpt-4.1", prompt: "test" }, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
        });
    });

    describe("supportsModel", () => {
        it("should return true for supported models", () => {
            expect(provider.supportsModel("gpt-4.1")).toBe(true);
            expect(provider.supportsModel("gpt-4o")).toBe(true);
            expect(provider.supportsModel("o3")).toBe(true);
        });

        it("should return false for unsupported models", () => {
            expect(provider.supportsModel("unknown-model")).toBe(false);
            expect(provider.supportsModel("claude-3")).toBe(false);
        });
    });
});
