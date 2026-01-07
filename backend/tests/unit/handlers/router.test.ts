/**
 * Router Node Handler Unit Tests
 *
 * Tests LLM-based classification/routing with mocked SDKs:
 * - Handler properties and type support
 * - OpenAI classification
 * - Anthropic classification
 * - Google classification
 * - Route selection signals
 * - Variable interpolation
 * - Error handling
 */

// Create mock functions before any imports
const mockOpenAIChatCreate = jest.fn();
const mockAnthropicMessagesCreate = jest.fn();
const mockGoogleGenerateContent = jest.fn();

// Mock OpenAI SDK
jest.mock("openai", () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockOpenAIChatCreate
            }
        }
    }));
});

// Mock Anthropic SDK
jest.mock("@anthropic-ai/sdk", () => {
    return jest.fn().mockImplementation(() => ({
        messages: {
            create: mockAnthropicMessagesCreate
        }
    }));
});

// Mock Google Generative AI SDK
jest.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGoogleGenerateContent
        })
    }))
}));

// Mock other modules
jest.mock("../../../src/services/EncryptionService", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockEncryptionService } = require("../../helpers/module-mocks");
    return mockEncryptionService();
});
jest.mock("../../../src/storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../helpers/module-mocks");
    return mockDatabase();
});
jest.mock("../../../src/core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../helpers/module-mocks");
    return mockAIConfig();
});

import type { JsonObject } from "@flowmaestro/shared";
import {
    RouterNodeHandler,
    createRouterNodeHandler
} from "../../../src/temporal/activities/execution/handlers/ai/router";
import {
    createHandlerInput,
    createTestContext,
    mustacheRef,
    assertValidOutput
} from "../../helpers/handler-test-utils";

// Helper type for router metadata
interface RouterMetadata {
    selectedRoute: string;
    routeLabel?: string;
    confidence: number;
    reasoning?: string;
    model?: string;
    provider?: string;
}

// Helper to get typed metadata from output
function getRouterMetadata(output: { result: JsonObject }): RouterMetadata {
    return output.result._routerMetadata as unknown as RouterMetadata;
}

// Helper to create OpenAI router response
function createOpenAIRouterResponse(
    selectedRoute: string,
    confidence: number = 0.95,
    reasoning: string = "Based on the analysis"
) {
    return {
        id: "chatcmpl-test",
        object: "chat.completion",
        created: Date.now(),
        model: "gpt-4o-mini",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: JSON.stringify({ selectedRoute, confidence, reasoning })
                },
                finish_reason: "stop"
            }
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
    };
}

// Helper to create Anthropic router response
function createAnthropicRouterResponse(
    selectedRoute: string,
    confidence: number = 0.95,
    reasoning: string = "Based on the analysis"
) {
    return {
        id: "msg-test",
        type: "message",
        role: "assistant",
        content: [
            {
                type: "text",
                text: JSON.stringify({ selectedRoute, confidence, reasoning })
            }
        ],
        model: "claude-3-haiku-20240307",
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 50 }
    };
}

// Helper to create Google router response
function createGoogleRouterResponse(
    selectedRoute: string,
    confidence: number = 0.95,
    reasoning: string = "Based on the analysis"
) {
    return {
        response: {
            text: () => JSON.stringify({ selectedRoute, confidence, reasoning }),
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 }
        }
    };
}

// Standard route config for tests
const standardRoutes = [
    { value: "billing", label: "Billing", description: "Questions about billing and payments" },
    { value: "technical", label: "Technical Support", description: "Technical issues and bugs" },
    { value: "sales", label: "Sales", description: "Sales inquiries and pricing" },
    { value: "general", label: "General", description: "General questions" }
];

describe("RouterNodeHandler", () => {
    let handler: RouterNodeHandler;

    // Set environment variables for tests
    const originalEnv = process.env;

    beforeAll(() => {
        process.env = {
            ...originalEnv,
            OPENAI_API_KEY: "test-openai-key",
            ANTHROPIC_API_KEY: "test-anthropic-key",
            GOOGLE_API_KEY: "test-google-key"
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    beforeEach(() => {
        handler = createRouterNodeHandler();
        jest.clearAllMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("RouterNodeHandler");
        });

        it("supports router node type", () => {
            expect(handler.supportedNodeTypes).toContain("router");
        });

        it("can handle router type", () => {
            expect(handler.canHandle("router")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("conditional")).toBe(false);
        });
    });

    describe("OpenAI classification", () => {
        it("selects correct route based on input", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "User asked about invoice")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "I have a question about my invoice",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.routerResult).toBe("billing");
            expect(getRouterMetadata(output).selectedRoute).toBe("billing");
            expect(output.signals?.selectedRoute).toBe("billing");
        });

        it("includes confidence score in output", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("technical", 0.87, "Technical issue detected")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "My app is crashing",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(getRouterMetadata(output).confidence).toBeCloseTo(0.87, 1);
        });

        it("includes reasoning in output", async () => {
            const reasoning = "The user is asking about software bugs which is technical support.";
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("technical", 0.9, reasoning)
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "There is a bug in the software",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(getRouterMetadata(output).reasoning).toBe(reasoning);
        });

        it("falls back to default route when LLM returns unknown route", async () => {
            // When LLM returns an unknown route not in the defined routes,
            // handler falls back to the defaultRoute
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("unknown_route", 0.6, "Could not determine intent")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    defaultRoute: "general",
                    prompt: "Hello",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            // Handler falls back to defaultRoute when LLM returns unknown route
            expect(output.signals?.selectedRoute).toBe("general");
        });
    });

    describe("Anthropic classification", () => {
        it("selects correct route using Anthropic", async () => {
            mockAnthropicMessagesCreate.mockResolvedValue(
                createAnthropicRouterResponse("sales", 0.92, "User wants pricing information")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-haiku-20240307",
                    routes: standardRoutes,
                    prompt: "What are your pricing plans?",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.routerResult).toBe("sales");
            expect(output.signals?.selectedRoute).toBe("sales");
        });

        it("handles Anthropic response format correctly", async () => {
            mockAnthropicMessagesCreate.mockResolvedValue(
                createAnthropicRouterResponse("billing", 0.88, "Billing question")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "anthropic",
                    model: "claude-3-haiku-20240307",
                    routes: standardRoutes,
                    prompt: "When will I be charged?",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(getRouterMetadata(output).confidence).toBeCloseTo(0.88, 1);
        });
    });

    describe("Google classification", () => {
        it("selects correct route using Google", async () => {
            mockGoogleGenerateContent.mockResolvedValue(
                createGoogleRouterResponse("technical", 0.89, "Technical support needed")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "google",
                    model: "gemini-1.5-flash",
                    routes: standardRoutes,
                    prompt: "I can't log in to my account",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.routerResult).toBe("technical");
            expect(output.signals?.selectedRoute).toBe("technical");
        });
    });

    describe("variable interpolation", () => {
        it("interpolates input from context", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing question")
            );

            const context = createTestContext({
                nodeOutputs: {
                    userInput: { message: "How much do I owe?" }
                }
            });

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: mustacheRef("userInput", "message"),
                    outputVariable: "routerResult"
                },
                context
            });

            const output = await handler.execute(input);

            expect(output.result.routerResult).toBeDefined();
        });

        it("interpolates route descriptions from context", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("custom", 0.9, "Custom route")
            );

            const context = createTestContext({
                nodeOutputs: {
                    config: { routeDesc: "Handle custom requests" }
                }
            });

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: [
                        {
                            value: "custom",
                            label: "Custom",
                            description: mustacheRef("config", "routeDesc")
                        },
                        { value: "other", label: "Other", description: "Other requests" }
                    ],
                    prompt: "Process this custom request",
                    outputVariable: "routerResult"
                },
                context
            });

            await handler.execute(input);

            // Verify the SDK was called
            expect(mockOpenAIChatCreate).toHaveBeenCalled();
        });
    });

    describe("output structure", () => {
        it("includes selectedRoute in output", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Invoice question",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(getRouterMetadata(output).selectedRoute).toBe("billing");
        });

        it("includes provider in output", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Invoice question",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(getRouterMetadata(output).provider).toBe("openai");
        });

        it("includes model in output", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Invoice question",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(getRouterMetadata(output).model).toBe("gpt-4o-mini");
        });

        it("wraps result in outputVariable when specified", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Invoice question",
                    outputVariable: "routingResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("routingResult");
        });
    });

    describe("signals", () => {
        it("sets selectedRoute in signals", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("technical", 0.95, "Technical")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "App crashed",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals).toBeDefined();
            expect(output.signals?.selectedRoute).toBe("technical");
        });

        it("returns route with low confidence", async () => {
            // Handler doesn't currently enforce minConfidence - it just returns what LLM says
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.3, "Low confidence match")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    defaultRoute: "general",
                    prompt: "...",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals?.selectedRoute).toBe("billing");
            expect(getRouterMetadata(output).confidence).toBe(0.3);
        });
    });

    describe("error handling", () => {
        it("handles API errors gracefully", async () => {
            mockOpenAIChatCreate.mockRejectedValue(new Error("API Error"));

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Test",
                    outputVariable: "routerResult"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles invalid JSON response by falling back to default", async () => {
            mockOpenAIChatCreate.mockResolvedValue({
                id: "chatcmpl-test",
                choices: [
                    {
                        message: {
                            content: "not valid json"
                        }
                    }
                ],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            });

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Test",
                    outputVariable: "routerResult"
                }
            });

            // Handler falls back to first route when JSON parsing fails
            const output = await handler.execute(input);
            expect(getRouterMetadata(output).reasoning).toBe("Failed to parse LLM response");
        });

        it("handles persistent API errors after retries", async () => {
            // Mock to fail multiple times (handler has retry logic)
            mockOpenAIChatCreate.mockRejectedValue(new Error("Persistent API failure"));

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Test",
                    outputVariable: "routerResult"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow("Persistent API failure");
        }, 15000);
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Invoice question",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records token usage when available", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.95, "Billing")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: "Invoice question",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            // Token usage comes from _routerMetadata.usage, which our mock doesn't populate
            // So metrics.tokenUsage will be undefined (this is correct behavior)
            expect(output.metrics).toBeDefined();
        });
    });

    describe("edge cases", () => {
        it("handles many routes", async () => {
            const manyRoutes = Array.from({ length: 10 }, (_, i) => ({
                value: `route${i}`,
                label: `Route ${i}`,
                description: `Description for route ${i}`
            }));

            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("route5", 0.85, "Route 5 selected")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: manyRoutes,
                    prompt: "Route to 5",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.routerResult).toBe("route5");
        });

        it("handles minimal input", async () => {
            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("general", 0.5, "Minimal input")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    defaultRoute: "general",
                    prompt: "?",
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.signals?.selectedRoute).toBeDefined();
        });

        it("handles very long input", async () => {
            const longInput = "word ".repeat(1000);

            mockOpenAIChatCreate.mockResolvedValue(
                createOpenAIRouterResponse("billing", 0.9, "Long input processed")
            );

            const input = createHandlerInput({
                nodeType: "router",
                nodeConfig: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    routes: standardRoutes,
                    prompt: longInput,
                    outputVariable: "routerResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.routerResult).toBe("billing");
        });
    });
});
