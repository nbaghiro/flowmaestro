/**
 * Embeddings Node Handler Unit Tests
 *
 * Tests embedding handler with mocked external APIs:
 * - Handler properties and type support
 * - OpenAI embeddings
 * - Cohere embeddings
 * - Google embeddings
 * - Variable interpolation
 * - Error handling
 */

// Create mock functions before any imports
const mockEmbeddingGenerate = jest.fn();

// Mock the unified AI SDK
jest.mock("../../../../../core/ai", () => ({
    getAIClient: jest.fn(() => ({
        embedding: {
            generate: mockEmbeddingGenerate
        }
    })),
    resetAIClient: jest.fn()
}));

// Mock modules before any imports that use them
jest.mock("../../../../../core/config", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockAIConfig } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockAIConfig();
});
jest.mock("../../../../../storage/database", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockDatabase } = require("../../../../../../__tests__/helpers/module-mocks");
    return mockDatabase();
});

import {
    createHandlerInput,
    createTestContext,
    mustacheRef,
    assertValidOutput
} from "../../../../../../__tests__/helpers/handler-test-utils";
import { EmbeddingsNodeHandler, createEmbeddingsNodeHandler } from "../ai/embeddings";

// Helper to create a mock embedding vector
function createMockEmbedding(dimensions: number = 1536): number[] {
    return Array(dimensions)
        .fill(0)
        .map(() => Math.random() * 2 - 1);
}

// Helper to create unified SDK embeddings response
function createEmbeddingResponse(
    embeddings: number[][],
    model: string = "text-embedding-3-small",
    provider: string = "openai"
) {
    const dimensions = embeddings[0]?.length ?? 1536;
    return {
        embeddings,
        dimensions,
        metadata: {
            processingTimeMs: 100,
            provider,
            model,
            inputCount: embeddings.length,
            usage: {
                totalTokens: embeddings.length * 10
            }
        }
    };
}

describe("EmbeddingsNodeHandler", () => {
    let handler: EmbeddingsNodeHandler;

    beforeEach(() => {
        handler = createEmbeddingsNodeHandler();
        jest.clearAllMocks();
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("EmbeddingsNodeHandler");
        });

        it("supports embeddings node type", () => {
            expect(handler.supportedNodeTypes).toContain("embeddings");
        });

        it("can handle embeddings type", () => {
            expect(handler.canHandle("embeddings")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("vision")).toBe(false);
        });
    });

    describe("schema validation", () => {
        it("throws error for unsupported provider", async () => {
            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "unsupported-provider",
                    model: "some-model",
                    input: "Test text"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow(/unsupported/i);
        });
    });

    describe("OpenAI embeddings", () => {
        it("generates embeddings for single text", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Hello world"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.embeddings).toBeDefined();
            expect((output.result.embeddings as number[][])[0]).toHaveLength(1536);
            expect(output.result.provider).toBe("openai");
            expect(output.result.model).toBe("text-embedding-3-small");
        });

        it("interpolates text from context", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const context = createTestContext({
                nodeOutputs: {
                    textNode: { content: "Dynamic text content" }
                }
            });

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: mustacheRef("textNode", "content")
                },
                context
            });

            await handler.execute(input);

            // Verify the SDK was called with interpolated text
            expect(mockEmbeddingGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: ["Dynamic text content"]
                })
            );
        });

        it("uses specified model", async () => {
            const mockEmbedding = createMockEmbedding(3072);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-large")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-large",
                    input: "Test"
                }
            });

            await handler.execute(input);

            expect(mockEmbeddingGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "text-embedding-3-large"
                })
            );
        });

        it("uses default model when not specified", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    input: "Test"
                }
            });

            await handler.execute(input);

            expect(mockEmbeddingGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "text-embedding-3-small"
                })
            );
        });
    });

    describe("batch embeddings", () => {
        it("generates embeddings for multiple texts", async () => {
            const mockEmbeddings = [
                createMockEmbedding(1536),
                createMockEmbedding(1536),
                createMockEmbedding(1536)
            ];

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse(mockEmbeddings, "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: ["First text", "Second text", "Third text"]
                }
            });

            const output = await handler.execute(input);

            expect(output.result.embeddings).toHaveLength(3);
            const metadata = output.result.metadata as { inputCount?: number };
            expect(metadata?.inputCount).toBe(3);
        });

        it("preserves order of embeddings", async () => {
            // Create distinctly different embeddings
            const mockEmbeddings = [
                Array(1536).fill(0.1),
                Array(1536).fill(0.5),
                Array(1536).fill(0.9)
            ];

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse(mockEmbeddings, "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: ["Text A", "Text B", "Text C"]
                }
            });

            const output = await handler.execute(input);
            const embeddings = output.result.embeddings as number[][];

            // Verify order is preserved by checking first values
            expect(embeddings[0][0]).toBeCloseTo(0.1);
            expect(embeddings[1][0]).toBeCloseTo(0.5);
            expect(embeddings[2][0]).toBeCloseTo(0.9);
        });
    });

    describe("Cohere embeddings", () => {
        it("generates embeddings using Cohere provider", async () => {
            const mockEmbedding = createMockEmbedding(1024);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "embed-english-v3.0", "cohere")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "cohere",
                    model: "embed-english-v3.0",
                    input: "Test text"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("cohere");
            expect(output.result.model).toBe("embed-english-v3.0");
            expect(output.result.embeddings).toBeDefined();
        });

        it("uses task type for Cohere", async () => {
            const mockEmbedding = createMockEmbedding(1024);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "embed-english-v3.0", "cohere")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "cohere",
                    model: "embed-english-v3.0",
                    input: "Test",
                    taskType: "search_query"
                }
            });

            await handler.execute(input);

            expect(mockEmbeddingGenerate).toHaveBeenCalledWith(
                expect.objectContaining({
                    taskType: "search_query"
                })
            );
        });
    });

    describe("Google embeddings", () => {
        it("generates embeddings using Google provider", async () => {
            const mockEmbedding = createMockEmbedding(768);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-004", "google")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "google",
                    model: "text-embedding-004",
                    input: "Test text"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("google");
            expect(output.result.model).toBe("text-embedding-004");
            expect(output.result.embeddings).toBeDefined();
        });
    });

    describe("output structure", () => {
        it("includes provider in output", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.provider).toBe("openai");
        });

        it("includes model in output", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.model).toBe("text-embedding-3-small");
        });

        it("includes dimensions info", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            const output = await handler.execute(input);

            const metadata = output.result.metadata as { dimensions?: number };
            expect(metadata?.dimensions).toBe(1536);
        });

        it("wraps result in outputVariable when specified", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test",
                    outputVariable: "embeddingResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result).toHaveProperty("embeddingResult");
            const wrapped = output.result.embeddingResult as { embeddings: number[][] };
            expect(wrapped.embeddings).toBeDefined();
        });
    });

    describe("error handling", () => {
        it("handles API errors gracefully", async () => {
            mockEmbeddingGenerate.mockRejectedValue(new Error("Internal server error"));

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles rate limit errors", async () => {
            const rateLimitError = new Error("Rate limit exceeded");
            (rateLimitError as Error & { status: number }).status = 429;
            mockEmbeddingGenerate.mockRejectedValue(rateLimitError);

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });

        it("handles authentication errors", async () => {
            const authError = new Error("Invalid API key");
            (authError as Error & { status: number }).status = 401;
            mockEmbeddingGenerate.mockRejectedValue(authError);

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            await expect(handler.execute(input)).rejects.toThrow();
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });

        it("records token usage", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue({
                embeddings: [mockEmbedding],
                dimensions: 1536,
                metadata: {
                    processingTimeMs: 50,
                    provider: "openai",
                    model: "text-embedding-3-small",
                    inputCount: 1,
                    usage: { totalTokens: 10 }
                }
            });

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics?.tokenUsage?.totalTokens).toBe(10);
        });
    });

    describe("edge cases", () => {
        it("handles very long text", async () => {
            const longText = "word ".repeat(5000);
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: longText
                }
            });

            const output = await handler.execute(input);

            expect(output.result.embeddings).toBeDefined();
        });

        it("handles special characters", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Test with emojis and special characters!"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.embeddings).toBeDefined();
        });

        it("handles multiline text", async () => {
            const mockEmbedding = createMockEmbedding(1536);

            mockEmbeddingGenerate.mockResolvedValue(
                createEmbeddingResponse([mockEmbedding], "text-embedding-3-small")
            );

            const input = createHandlerInput({
                nodeType: "embeddings",
                nodeConfig: {
                    provider: "openai",
                    model: "text-embedding-3-small",
                    input: "Line 1\nLine 2\nLine 3\n\nParagraph 2"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.embeddings).toBeDefined();
        });
    });
});
