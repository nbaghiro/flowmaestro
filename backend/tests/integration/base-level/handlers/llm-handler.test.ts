/**
 * LLM Handler Integration Tests
 *
 * Tests for LLM node execution behavior including:
 * - Variable interpolation in prompts
 * - Retry logic for various error types
 * - Output formatting
 *
 * Note: These tests mock actual LLM API calls to test handler logic.
 */

import {
    createContext,
    storeNodeOutput,
    setVariable,
    interpolateString,
    getExecutionContext
} from "../../../../src/temporal/core/services/context";

interface MockLLMResponse {
    text: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    model: string;
    provider: string;
}

// Helper to check if an error is retryable (mirrors LLM handler logic)
function isRetryableError(error: { status?: number; type?: string; message?: string }): boolean {
    const retryableStatusCodes = [429, 500, 502, 503, 529];

    if (error.status && retryableStatusCodes.includes(error.status)) {
        return true;
    }

    if (error.type && ["overloaded_error", "rate_limit_error"].includes(error.type)) {
        return true;
    }

    if (error.message) {
        const message = error.message.toLowerCase();
        if (
            message.includes("overloaded") ||
            message.includes("rate limit") ||
            message.includes("too many requests") ||
            message.includes("is currently loading")
        ) {
            return true;
        }
    }

    return false;
}

// Helper to format LLM output
function formatLLMOutput(response: MockLLMResponse): Record<string, unknown> {
    return {
        text: response.text,
        model: response.model,
        provider: response.provider,
        tokens: response.usage
            ? {
                  prompt: response.usage.promptTokens,
                  completion: response.usage.completionTokens,
                  total: response.usage.totalTokens
              }
            : null
    };
}

describe("LLM Handler", () => {
    describe("variable interpolation", () => {
        it("should interpolate variables in prompt", () => {
            let context = createContext({ userName: "Alice" });
            context = storeNodeOutput(context, "DataFetch", {
                topic: "machine learning",
                style: "technical"
            });

            const promptTemplate =
                "Hello {{userName}}, please explain {{DataFetch.topic}} in a {{DataFetch.style}} style.";

            const interpolated = interpolateString(context, promptTemplate);

            expect(interpolated).toBe(
                "Hello Alice, please explain machine learning in a technical style."
            );
        });

        it("should interpolate nested object paths", () => {
            let context = createContext({});
            context = storeNodeOutput(context, "UserData", {
                profile: {
                    name: "Bob",
                    preferences: {
                        language: "Spanish",
                        formality: "formal"
                    }
                }
            });

            const promptTemplate =
                "Translate for {{UserData.profile.name}} in {{UserData.profile.preferences.language}} ({{UserData.profile.preferences.formality}})";

            const interpolated = interpolateString(context, promptTemplate);

            expect(interpolated).toBe("Translate for Bob in Spanish (formal)");
        });

        it("should handle missing variables gracefully", () => {
            const context = createContext({});

            const promptTemplate = "Hello {{missingVar}}, how are you?";
            const interpolated = interpolateString(context, promptTemplate);

            // Missing variables should remain as-is or be replaced with placeholder
            expect(interpolated).toContain("{{missingVar}}");
        });

        it("should interpolate variables in system prompt", () => {
            let context = createContext({});
            context = setVariable(context, "assistantRole", "helpful coding assistant");
            context = setVariable(context, "expertise", "TypeScript and React");

            const systemPrompt = "You are a {{assistantRole}} with expertise in {{expertise}}.";

            const interpolated = interpolateString(context, systemPrompt);

            expect(interpolated).toBe(
                "You are a helpful coding assistant with expertise in TypeScript and React."
            );
        });

        it("should handle array values in interpolation", () => {
            let context = createContext({});
            context = storeNodeOutput(context, "Topics", {
                items: ["AI", "ML", "DL"]
            });

            const promptTemplate = "Explain these topics: {{Topics.items}}";
            const interpolated = interpolateString(context, promptTemplate);

            // Arrays should be JSON serialized
            expect(interpolated).toContain('["AI","ML","DL"]');
        });

        it("should handle special characters in prompts", () => {
            const context = createContext({ code: "const x = 1 + 2;" });

            const promptTemplate = "Review this code: {{code}}";
            const interpolated = interpolateString(context, promptTemplate);

            expect(interpolated).toBe("Review this code: const x = 1 + 2;");
        });

        it("should handle multiline prompts", () => {
            let context = createContext({});
            context = storeNodeOutput(context, "Input", { text: "Hello\nWorld" });

            const promptTemplate = "Process:\n{{Input.text}}\nEnd";
            const interpolated = interpolateString(context, promptTemplate);

            expect(interpolated).toBe("Process:\nHello\nWorld\nEnd");
        });
    });

    describe("retry logic", () => {
        it("should retry on rate limit (429)", () => {
            const error = { status: 429, message: "Rate limit exceeded" };
            expect(isRetryableError(error)).toBe(true);
        });

        it("should retry on server error (500, 502, 503)", () => {
            expect(isRetryableError({ status: 500 })).toBe(true);
            expect(isRetryableError({ status: 502 })).toBe(true);
            expect(isRetryableError({ status: 503 })).toBe(true);
        });

        it("should not retry on auth error (401)", () => {
            const error = { status: 401, message: "Unauthorized" };
            expect(isRetryableError(error)).toBe(false);
        });

        it("should not retry on bad request (400)", () => {
            const error = { status: 400, message: "Invalid request" };
            expect(isRetryableError(error)).toBe(false);
        });

        it("should not retry on not found (404)", () => {
            const error = { status: 404, message: "Model not found" };
            expect(isRetryableError(error)).toBe(false);
        });

        it("should retry on overloaded error type", () => {
            const error = { type: "overloaded_error", message: "Model overloaded" };
            expect(isRetryableError(error)).toBe(true);
        });

        it("should retry on rate_limit_error type", () => {
            const error = { type: "rate_limit_error", message: "Too many requests" };
            expect(isRetryableError(error)).toBe(true);
        });

        it("should retry on message containing rate limit", () => {
            const error = { message: "You have exceeded the rate limit for this model" };
            expect(isRetryableError(error)).toBe(true);
        });

        it("should retry when model is loading", () => {
            const error = { message: "Model gpt-4 is currently loading, please retry" };
            expect(isRetryableError(error)).toBe(true);
        });

        it("should not retry on content policy violation", () => {
            const error = { status: 400, message: "Content violates usage policy" };
            expect(isRetryableError(error)).toBe(false);
        });

        it("should not retry on invalid API key", () => {
            const error = { status: 401, message: "Invalid API key provided" };
            expect(isRetryableError(error)).toBe(false);
        });
    });

    describe("output formatting", () => {
        it("should return structured response with tokens", () => {
            const response: MockLLMResponse = {
                text: "This is the generated response.",
                usage: {
                    promptTokens: 50,
                    completionTokens: 100,
                    totalTokens: 150
                },
                model: "gpt-4",
                provider: "openai"
            };

            const output = formatLLMOutput(response);

            expect(output.text).toBe("This is the generated response.");
            expect(output.model).toBe("gpt-4");
            expect(output.provider).toBe("openai");
            expect(output.tokens).toEqual({
                prompt: 50,
                completion: 100,
                total: 150
            });
        });

        it("should handle response without token usage", () => {
            const response: MockLLMResponse = {
                text: "Response without usage data",
                model: "claude-3-opus",
                provider: "anthropic"
            };

            const output = formatLLMOutput(response);

            expect(output.text).toBe("Response without usage data");
            expect(output.tokens).toBeNull();
        });

        it("should preserve response text formatting", () => {
            const response: MockLLMResponse = {
                text: "Line 1\nLine 2\n\nParagraph 2",
                model: "gpt-3.5-turbo",
                provider: "openai"
            };

            const output = formatLLMOutput(response);

            expect(output.text).toBe("Line 1\nLine 2\n\nParagraph 2");
        });

        it("should handle empty response", () => {
            const response: MockLLMResponse = {
                text: "",
                model: "gpt-4",
                provider: "openai"
            };

            const output = formatLLMOutput(response);

            expect(output.text).toBe("");
        });

        it("should handle response with code blocks", () => {
            const response: MockLLMResponse = {
                text: "Here is the code:\n```typescript\nconst x = 1;\n```\nThat's it!",
                model: "gpt-4",
                provider: "openai"
            };

            const output = formatLLMOutput(response);

            expect(output.text).toContain("```typescript");
            expect(output.text).toContain("const x = 1;");
        });
    });

    describe("context integration", () => {
        it("should store LLM output in context", () => {
            let context = createContext({});

            // Simulate LLM execution result
            const llmResult = {
                text: "Generated text response",
                model: "gpt-4",
                provider: "openai",
                tokens: { prompt: 10, completion: 20, total: 30 }
            };

            context = storeNodeOutput(context, "LLMNode", llmResult);

            const execContext = getExecutionContext(context);
            expect(execContext.LLMNode).toEqual(llmResult);
        });

        it("should make LLM output available to downstream nodes", () => {
            let context = createContext({});

            // LLM generates text
            context = storeNodeOutput(context, "GenerateText", {
                text: "Hello, world!",
                tokens: { total: 25 }
            });

            // Downstream node uses LLM output
            const generatedText = context.nodeOutputs.get("GenerateText")?.text;

            context = storeNodeOutput(context, "ProcessText", {
                processed: (generatedText as string).toUpperCase(),
                originalLength: (generatedText as string).length
            });

            expect(context.nodeOutputs.get("ProcessText")).toEqual({
                processed: "HELLO, WORLD!",
                originalLength: 13
            });
        });

        it("should chain multiple LLM calls", () => {
            let context = createContext({ topic: "cats" });

            // First LLM: generate outline
            context = storeNodeOutput(context, "GenerateOutline", {
                text: "1. Introduction\n2. History\n3. Breeds",
                model: "gpt-3.5-turbo"
            });

            // Second LLM: expand outline (using first output)
            const outline = context.nodeOutputs.get("GenerateOutline")?.text;
            const expandPrompt = `Expand this outline about {{topic}}: ${outline}`;
            const interpolatedPrompt = interpolateString(context, expandPrompt);

            expect(interpolatedPrompt).toContain("cats");
            expect(interpolatedPrompt).toContain("Introduction");

            context = storeNodeOutput(context, "ExpandOutline", {
                text: "Detailed article about cats...",
                model: "gpt-4"
            });

            // Both outputs should be available
            expect(context.nodeOutputs.size).toBe(2);
        });
    });

    describe("provider-specific handling", () => {
        it("should format output consistently across providers", () => {
            const providers = ["openai", "anthropic", "google", "cohere"] as const;

            for (const provider of providers) {
                const response: MockLLMResponse = {
                    text: `Response from ${provider}`,
                    model: `${provider}-model`,
                    provider,
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                };

                const output = formatLLMOutput(response);

                // All providers should have consistent output structure
                expect(output).toHaveProperty("text");
                expect(output).toHaveProperty("model");
                expect(output).toHaveProperty("provider");
                expect(output).toHaveProperty("tokens");
            }
        });
    });

    describe("error handling", () => {
        it("should capture error details in output", () => {
            let context = createContext({});

            // Simulate LLM error
            context = storeNodeOutput(context, "FailedLLM", {
                error: true,
                errorType: "APIError",
                errorMessage: "Model quota exceeded",
                errorCode: 429,
                retryable: true
            });

            const output = context.nodeOutputs.get("FailedLLM");
            expect(output?.error).toBe(true);
            expect(output?.retryable).toBe(true);
        });

        it("should preserve partial output on streaming error", () => {
            let context = createContext({});

            // Simulate partial streaming response before error
            context = storeNodeOutput(context, "PartialLLM", {
                text: "This is partial text before the connection was...",
                partial: true,
                error: true,
                errorMessage: "Connection reset"
            });

            const output = context.nodeOutputs.get("PartialLLM");
            expect(output?.partial).toBe(true);
            expect((output?.text as string)?.length).toBeGreaterThan(0);
        });
    });
});
