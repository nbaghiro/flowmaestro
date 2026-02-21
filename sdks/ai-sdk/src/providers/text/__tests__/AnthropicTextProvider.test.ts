/**
 * Tests for Anthropic Text Provider
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { silentTestLogger } from "../../../__tests__/fixtures/configs";
import {
    mockAnthropicCompletion,
    mockAnthropicCompletionWithThinking
} from "../../../__tests__/fixtures/responses";
import type { TextCompletionRequest } from "../../../capabilities/text/types";

// Shared mock function - must be defined before vi.mock
const mockCreate = vi.fn();

// Mock Anthropic SDK - using a class that references the shared mock
vi.mock("@anthropic-ai/sdk", () => {
    return {
        default: class MockAnthropic {
            messages = {
                create: mockCreate
            };
        }
    };
});

// Import after mock is set up - must come after vi.mock()
// eslint-disable-next-line import/order
import { AnthropicTextProvider } from "../anthropic";

describe("AnthropicTextProvider", () => {
    let provider: AnthropicTextProvider;

    beforeEach(() => {
        vi.clearAllMocks();
        provider = new AnthropicTextProvider(silentTestLogger);
    });

    describe("properties", () => {
        it("should have correct provider name", () => {
            expect(provider.provider).toBe("anthropic");
        });

        it("should support expected models", () => {
            expect(provider.supportedModels).toContain("claude-sonnet-4-5-20250929");
            expect(provider.supportedModels).toContain("claude-opus-4-5-20251101");
            expect(provider.supportedModels).toContain("claude-3-5-sonnet-20241022");
            expect(provider.supportedModels).toContain("claude-3-5-haiku-20241022");
            expect(provider.supportedModels).toContain("claude-3-opus-20240229");
        });
    });

    describe("supportsThinking", () => {
        it("should return true for thinking-capable models", () => {
            expect(provider.supportsThinking("claude-sonnet-4-5-20250929")).toBe(true);
            expect(provider.supportsThinking("claude-opus-4-5-20251101")).toBe(true);
        });

        it("should return false for standard models", () => {
            expect(provider.supportsThinking("claude-3-5-sonnet-20241022")).toBe(false);
            expect(provider.supportsThinking("claude-3-5-haiku-20241022")).toBe(false);
            expect(provider.supportsThinking("claude-3-opus-20240229")).toBe(false);
        });
    });

    describe("complete", () => {
        it("should call Anthropic API with correct parameters", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletion);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                prompt: "Hello, how are you?",
                maxTokens: 100,
                temperature: 0.7
            };

            const response = await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "claude-sonnet-4-5-20250929",
                    max_tokens: 100,
                    temperature: 0.7,
                    stream: false
                })
            );
            expect(response.text).toBe("Hello! How can I assist you today?");
        });

        it("should handle system prompt separately", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletion);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                systemPrompt: "You are a helpful assistant.",
                prompt: "Hello"
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    system: "You are a helpful assistant.",
                    messages: [{ role: "user", content: "Hello" }]
                })
            );
        });

        it("should extract system message from message array", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletion);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                prompt: [
                    { role: "system", content: "Be concise" },
                    { role: "user", content: "Hi" }
                ]
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    system: "Be concise",
                    messages: [{ role: "user", content: "Hi" }]
                })
            );
        });

        it("should handle extended thinking", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletionWithThinking);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                prompt: "Solve 2 + 2",
                thinking: {
                    enabled: true,
                    budgetTokens: 4096
                }
            };

            const response = await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    thinking: {
                        type: "enabled",
                        budget_tokens: 4096
                    },
                    temperature: 1 // Must be 1 for thinking mode
                })
            );
            expect(response.thinking).toBeDefined();
            expect(response.thinking).toContain("Let me think");
        });

        it("should use default budgetTokens when not specified", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletionWithThinking);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                prompt: "test",
                thinking: { enabled: true }
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    thinking: {
                        type: "enabled",
                        budget_tokens: 4096
                    }
                })
            );
        });

        it("should not include temperature/topP when thinking is enabled", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletionWithThinking);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                prompt: "test",
                temperature: 0.5, // Should be overridden
                topP: 0.9, // Should be ignored
                thinking: { enabled: true }
            };

            await provider.complete(request, "test-api-key");

            const callArgs = mockCreate.mock.calls[0][0];
            expect(callArgs.temperature).toBe(1);
            expect(callArgs.top_p).toBeUndefined();
        });

        it("should handle stop sequences", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletion);

            const request: TextCompletionRequest = {
                model: "claude-sonnet-4-5-20250929",
                prompt: "test",
                stop: ["END", "STOP"]
            };

            await provider.complete(request, "test-api-key");

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    stop_sequences: ["END", "STOP"]
                })
            );
        });

        it("should return metadata with usage", async () => {
            mockCreate.mockResolvedValueOnce(mockAnthropicCompletion);

            const response = await provider.complete(
                { model: "claude-sonnet-4-5-20250929", prompt: "test" },
                "test-api-key"
            );

            expect(response.metadata.provider).toBe("anthropic");
            expect(response.metadata.model).toBe("claude-sonnet-4-5-20250929");
            expect(response.metadata.requestId).toBe("msg_01XFDUDYJgAACzvnptvVoYEL");
            expect(response.metadata.usage?.promptTokens).toBe(12);
            expect(response.metadata.usage?.completionTokens).toBe(10);
        });
    });

    describe("stream", () => {
        it("should return async iterator", async () => {
            // Create async generator for streaming
            async function* mockStream() {
                yield {
                    type: "message_start",
                    message: { id: "msg_123", usage: { input_tokens: 10 } }
                };
                yield {
                    type: "content_block_start",
                    index: 0,
                    content_block: { type: "text", text: "" }
                };
                yield {
                    type: "content_block_delta",
                    index: 0,
                    delta: { type: "text_delta", text: "Hello" }
                };
                yield {
                    type: "content_block_delta",
                    index: 0,
                    delta: { type: "text_delta", text: " World" }
                };
                yield { type: "content_block_stop", index: 0 };
                yield {
                    type: "message_delta",
                    delta: { stop_reason: "end_turn" },
                    usage: { output_tokens: 5 }
                };
                yield { type: "message_stop" };
            }

            mockCreate.mockResolvedValueOnce(mockStream());

            const stream = await provider.stream(
                { model: "claude-sonnet-4-5-20250929", prompt: "test" },
                "test-api-key"
            );

            const tokens: string[] = [];
            for await (const token of stream) {
                tokens.push(token);
            }

            expect(tokens).toEqual(["Hello", " World"]);
        });

        it("should handle thinking content in stream", async () => {
            async function* mockStream() {
                yield {
                    type: "message_start",
                    message: { id: "msg_123", usage: { input_tokens: 10 } }
                };
                yield {
                    type: "content_block_delta",
                    index: 0,
                    delta: { type: "thinking_delta", thinking: "Thinking..." }
                };
                yield {
                    type: "content_block_delta",
                    index: 1,
                    delta: { type: "text_delta", text: "Result" }
                };
                yield {
                    type: "message_delta",
                    delta: { stop_reason: "end_turn" },
                    usage: { output_tokens: 10 }
                };
            }

            mockCreate.mockResolvedValueOnce(mockStream());

            const stream = await provider.stream(
                {
                    model: "claude-sonnet-4-5-20250929",
                    prompt: "test",
                    thinking: { enabled: true }
                },
                "test-api-key"
            );

            // Consume stream
            for await (const _ of stream) {
                // Only text tokens are yielded
            }

            const response = await stream.getResponse();

            expect(response.thinking).toBe("Thinking...");
            expect(response.text).toBe("Result");
        });

        it("should call API with stream: true", async () => {
            async function* mockStream() {
                yield { type: "message_stop" };
            }

            mockCreate.mockResolvedValueOnce(mockStream());

            await provider.stream(
                { model: "claude-sonnet-4-5-20250929", prompt: "test" },
                "test-api-key"
            );

            expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
        });
    });

    describe("supportsModel", () => {
        it("should return true for supported models", () => {
            expect(provider.supportsModel("claude-sonnet-4-5-20250929")).toBe(true);
            expect(provider.supportsModel("claude-3-5-sonnet-20241022")).toBe(true);
        });

        it("should return false for unsupported models", () => {
            expect(provider.supportsModel("gpt-4")).toBe(false);
            expect(provider.supportsModel("unknown")).toBe(false);
        });
    });
});
