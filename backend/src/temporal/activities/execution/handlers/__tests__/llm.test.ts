/**
 * LLM Node Handler Unit Tests
 *
 * Tests LLM/text generation logic:
 * - Handler properties and provider support
 * - Config validation
 * - Variable interpolation in prompts
 * - Provider dispatch (OpenAI, Anthropic, Google, Cohere, HuggingFace)
 * - Token usage tracking
 * - Error handling
 *
 * Note: External API calls are mocked using nock
 */

import nock from "nock";
import {
    createHandlerInput,
    createTestContext,
    mustacheRef
} from "../../../../../../__tests__/helpers/handler-test-utils";
import {
    mockOpenAIChatCompletion,
    mockAnthropicMessage,
    setupHttpMocking,
    teardownHttpMocking,
    clearHttpMocks
} from "../../../../../../__tests__/helpers/http-mock";
import { AuthenticationError, resetAIClient } from "../../../../../services/ai";
import { LLMNodeHandler, createLLMNodeHandler } from "../ai/llm";

// Mock the connection repository
jest.mock("../../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => ({
        findByIdWithData: jest.fn()
    }))
}));

// Set up environment variables for API keys (for env-based auth path)
const originalEnv = process.env;

describe("LLMNodeHandler", () => {
    let handler: LLMNodeHandler;

    beforeAll(() => {
        setupHttpMocking();
    });

    afterAll(() => {
        teardownHttpMocking();
    });

    beforeEach(() => {
        handler = createLLMNodeHandler();
        clearHttpMocks();
        // Reset environment
        process.env = { ...originalEnv };
        // Reset the AI client singleton so it picks up env changes
        resetAIClient();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("LLMNodeHandler");
        });

        it("supports llm node type", () => {
            expect(handler.supportedNodeTypes).toContain("llm");
        });

        it("can handle llm type", () => {
            expect(handler.canHandle("llm")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("vision")).toBe(false);
            expect(handler.canHandle("audio")).toBe(false);
            expect(handler.canHandle("embeddings")).toBe(false);
        });
    });

    describe("config validation", () => {
        it("throws error when provider is missing", async () => {
            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    model: "gpt-4",
                    prompt: "Hello"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error when model is missing", async () => {
            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    prompt: "Hello"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error when prompt is missing", async () => {
            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("throws error for unsupported provider", async () => {
            process.env.UNKNOWN_API_KEY = "test-key";
            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "unknown-provider",
                    model: "some-model",
                    prompt: "Hello"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("OpenAI provider", () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = "test-openai-key";
        });

        it("calls OpenAI API and returns response", async () => {
            mockOpenAIChatCompletion({
                content: "Hello! How can I help you today?",
                model: "gpt-4",
                promptTokens: 5,
                completionTokens: 10
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Say hello"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.text).toBe("Hello! How can I help you today?");
            expect(output.result.provider).toBe("openai");
            expect(output.result.model).toBe("gpt-4");
        });

        it("includes token usage in metrics", async () => {
            mockOpenAIChatCompletion({
                content: "Response",
                promptTokens: 15,
                completionTokens: 25
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test prompt"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics?.tokenUsage).toBeDefined();
            expect(output.metrics?.tokenUsage?.promptTokens).toBe(15);
            expect(output.metrics?.tokenUsage?.completionTokens).toBe(25);
            expect(output.metrics?.tokenUsage?.totalTokens).toBe(40);
        });

        it("passes system prompt when provided", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    created: Date.now(),
                    model: "gpt-4",
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: "I am a helpful assistant." },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 }
                });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    systemPrompt: "You are a helpful assistant.",
                    prompt: "Who are you?"
                }
            });

            await handler.execute(input);

            expect(capturedBody).not.toBeNull();
            const messages = capturedBody!.messages as Array<{ role: string; content: string }>;
            expect(messages[0].role).toBe("system");
            expect(messages[0].content).toBe("You are a helpful assistant.");
        });

        it("uses configured temperature", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    created: Date.now(),
                    model: "gpt-4",
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: "Response" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
                });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test",
                    temperature: 0.5
                }
            });

            await handler.execute(input);

            expect(capturedBody!.temperature).toBe(0.5);
        });
    });

    describe("Anthropic provider", () => {
        beforeEach(() => {
            process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
        });

        it("calls Anthropic API and returns response", async () => {
            mockAnthropicMessage({
                content: "Hello from Claude!",
                model: "claude-3-5-sonnet-20241022",
                inputTokens: 8,
                outputTokens: 12
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    prompt: "Say hello"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.text).toBe("Hello from Claude!");
            expect(output.result.provider).toBe("anthropic");
            expect(output.result.model).toBe("claude-3-5-sonnet-20241022");
        });

        it("includes token usage from Anthropic response", async () => {
            mockAnthropicMessage({
                content: "Response",
                inputTokens: 20,
                outputTokens: 30
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-5-sonnet-20241022",
                    prompt: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics?.tokenUsage?.promptTokens).toBe(20);
            expect(output.metrics?.tokenUsage?.completionTokens).toBe(30);
            expect(output.metrics?.tokenUsage?.totalTokens).toBe(50);
        });
    });

    describe("variable interpolation", () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = "test-openai-key";
        });

        it("interpolates variables in prompt", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    created: Date.now(),
                    model: "gpt-4",
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: "Summary complete" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
                });

            const context = createTestContext({
                nodeOutputs: {
                    fetchData: { content: "This is the article content to summarize." }
                }
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: `Summarize this: ${mustacheRef("fetchData", "content")}`
                },
                context
            });

            await handler.execute(input);

            const messages = capturedBody!.messages as Array<{ role: string; content: string }>;
            expect(messages[messages.length - 1].content).toBe(
                "Summarize this: This is the article content to summarize."
            );
        });

        it("interpolates variables in system prompt", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    created: Date.now(),
                    model: "gpt-4",
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: "Done" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
                });

            const context = createTestContext({
                inputs: { role: "technical writer" }
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    systemPrompt: `You are a ${mustacheRef("role")}.`,
                    prompt: "Write something"
                },
                context
            });

            await handler.execute(input);

            const messages = capturedBody!.messages as Array<{ role: string; content: string }>;
            expect(messages[0].content).toBe("You are a technical writer.");
        });
    });

    describe("output variable", () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = "test-openai-key";
        });

        it("wraps result in outputVariable when specified", async () => {
            mockOpenAIChatCompletion({ content: "Response text" });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test",
                    outputVariable: "llmResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("llmResult");
            expect((output.result.llmResult as Record<string, unknown>).text).toBe("Response text");
        });
    });

    describe("API key handling", () => {
        it("throws error when no API key available", async () => {
            // Reset client to clear any cached config
            resetAIClient();

            // Mock getAIClient to return a client that throws AuthenticationError
            const mockComplete = jest
                .fn()
                .mockRejectedValue(
                    new AuthenticationError(
                        "openai",
                        "No API key available for openai. Set the OPENAI_API_KEY environment variable."
                    )
                );

            // eslint-disable-next-line @typescript-eslint/no-require-imports
            jest.spyOn(require("../../../../../services/ai"), "getAIClient").mockReturnValue({
                text: { complete: mockComplete, stream: jest.fn() }
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/OPENAI_API_KEY/);

            // Restore
            jest.restoreAllMocks();
        });
    });

    describe("metrics", () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = "test-openai-key";
        });

        it("records execution duration", async () => {
            mockOpenAIChatCompletion({ content: "Response" });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("includes provider and model in token usage", async () => {
            mockOpenAIChatCompletion({
                content: "Response",
                model: "gpt-4-turbo",
                promptTokens: 10,
                completionTokens: 20
            });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4-turbo",
                    prompt: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics?.tokenUsage?.provider).toBe("openai");
            expect(output.metrics?.tokenUsage?.model).toBe("gpt-4-turbo");
        });
    });

    describe("error handling", () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = "test-openai-key";
        });

        it("handles 500 server error", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(500, {
                    error: {
                        message: "Internal server error",
                        type: "server_error"
                    }
                });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles 401 authentication error", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(401, {
                    error: {
                        message: "Invalid API key",
                        type: "invalid_request_error"
                    }
                });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("edge cases", () => {
        beforeEach(() => {
            process.env.OPENAI_API_KEY = "test-openai-key";
        });

        it("handles empty response content", async () => {
            nock("https://api.openai.com")
                .post("/v1/chat/completions")
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    created: Date.now(),
                    model: "gpt-4",
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: "" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 }
                });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.text).toBe("");
        });

        it("handles very long prompts", async () => {
            const longPrompt = "A".repeat(10000);

            mockOpenAIChatCompletion({ content: "Response to long prompt" });

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: longPrompt
                }
            });

            const output = await handler.execute(input);

            expect(output.result.text).toBe("Response to long prompt");
        });

        it("handles special characters in prompt", async () => {
            let capturedBody: Record<string, unknown> | null = null;

            nock("https://api.openai.com")
                .post("/v1/chat/completions", (body) => {
                    capturedBody = body as Record<string, unknown>;
                    return true;
                })
                .reply(200, {
                    id: "chatcmpl-test",
                    object: "chat.completion",
                    created: Date.now(),
                    model: "gpt-4",
                    choices: [
                        {
                            index: 0,
                            message: { role: "assistant", content: "Response" },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
                });

            const specialPrompt = 'Test with "quotes", <tags>, & ampersands, and emoji 🎉';

            const input = createHandlerInput({
                nodeType: "llm",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4",
                    prompt: specialPrompt
                }
            });

            await handler.execute(input);

            const messages = capturedBody!.messages as Array<{ role: string; content: string }>;
            expect(messages[messages.length - 1].content).toBe(specialPrompt);
        });
    });
});
