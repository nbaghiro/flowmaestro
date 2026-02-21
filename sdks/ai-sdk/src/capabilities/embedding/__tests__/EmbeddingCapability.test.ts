/**
 * Tests for EmbeddingCapability
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    TEST_API_KEYS,
    fastRetryConfig,
    silentTestLogger,
    captureTestLogger,
    testEmbeddingRequest,
    testEmbeddingRequestMultiple
} from "../../../__tests__/fixtures/configs";
import { RateLimitError } from "../../../core/errors";
import { ProviderRegistry } from "../../../providers/registry";
import { EmbeddingCapability } from "../index";
import type { EmbeddingProvider } from "../../../providers/base";
import type { EmbeddingResponse } from "../types";

// Mock provider
function createMockEmbeddingProvider(overrides?: Partial<EmbeddingProvider>): EmbeddingProvider {
    return {
        provider: "openai",
        supportedModels: ["text-embedding-3-small", "text-embedding-3-large"],
        supportsModel: vi.fn().mockReturnValue(true),
        embed: vi.fn().mockResolvedValue({
            embeddings: [new Array(1536).fill(0.1)],
            dimensions: 1536,
            metadata: {
                processingTimeMs: 50,
                provider: "openai",
                model: "text-embedding-3-small",
                inputCount: 1,
                usage: { promptTokens: 5, totalTokens: 5 }
            }
        } as EmbeddingResponse),
        ...overrides
    };
}

describe("EmbeddingCapability", () => {
    let registry: ProviderRegistry;
    let capability: EmbeddingCapability;
    let mockProvider: EmbeddingProvider;

    beforeEach(() => {
        registry = new ProviderRegistry({
            providers: { openai: { apiKey: TEST_API_KEYS.openai } },
            logger: silentTestLogger
        });

        mockProvider = createMockEmbeddingProvider();

        registry.registerEmbeddingProvider("openai", () => mockProvider);
        registry.setDefaultProvider("embedding", "openai");

        capability = new EmbeddingCapability(registry, fastRetryConfig, silentTestLogger);
    });

    describe("generate", () => {
        it("should call provider embed method", async () => {
            const request = { ...testEmbeddingRequest, provider: "openai" as const };

            const response = await capability.generate(request);

            expect(mockProvider.embed).toHaveBeenCalledWith(request, TEST_API_KEYS.openai);
            expect(response.embeddings.length).toBe(1);
            expect(response.dimensions).toBe(1536);
        });

        it("should use default provider when not specified", async () => {
            const request = { model: "text-embedding-3-small", input: "test" };

            await capability.generate(request);

            expect(mockProvider.embed).toHaveBeenCalled();
        });

        it("should handle multiple inputs", async () => {
            mockProvider.embed = vi.fn().mockResolvedValue({
                embeddings: [
                    new Array(1536).fill(0.1),
                    new Array(1536).fill(0.2),
                    new Array(1536).fill(0.3)
                ],
                dimensions: 1536,
                metadata: {
                    processingTimeMs: 100,
                    provider: "openai",
                    model: "text-embedding-3-small",
                    inputCount: 3
                }
            } as EmbeddingResponse);

            const response = await capability.generate({
                ...testEmbeddingRequestMultiple,
                provider: "openai" as const
            });

            expect(response.embeddings.length).toBe(3);
        });

        it("should log request info", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new EmbeddingCapability(registry, fastRetryConfig, logger);

            await capability.generate({ ...testEmbeddingRequest, provider: "openai" as const });

            const infoLogs = logs.filter((l) => l.level === "info");
            expect(infoLogs.some((l) => l.message === "Embedding request")).toBe(true);
        });

        it("should include input count in logs", async () => {
            const { logger, logs } = captureTestLogger();
            capability = new EmbeddingCapability(registry, fastRetryConfig, logger);

            await capability.generate({
                model: "text-embedding-3-small",
                input: ["one", "two", "three"],
                provider: "openai" as const
            });

            const infoLog = logs.find((l) => l.message === "Embedding request");
            expect(infoLog?.context?.inputCount).toBe(3);
        });

        it("should retry on retryable errors", async () => {
            vi.useFakeTimers();

            mockProvider.embed = vi
                .fn()
                .mockRejectedValueOnce(new RateLimitError("openai"))
                .mockResolvedValue({
                    embeddings: [new Array(1536).fill(0.1)],
                    dimensions: 1536,
                    metadata: {
                        processingTimeMs: 50,
                        provider: "openai",
                        model: "text-embedding-3-small",
                        inputCount: 1
                    }
                } as EmbeddingResponse);

            const resultPromise = capability.generate({
                ...testEmbeddingRequest,
                provider: "openai" as const
            });

            await vi.runAllTimersAsync();
            const response = await resultPromise;

            expect(response.embeddings.length).toBe(1);
            expect(mockProvider.embed).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });

        it("should handle dimensions parameter", async () => {
            const request = {
                model: "text-embedding-3-small",
                input: "test",
                dimensions: 256,
                provider: "openai" as const
            };

            await capability.generate(request);

            expect(mockProvider.embed).toHaveBeenCalledWith(
                expect.objectContaining({ dimensions: 256 }),
                expect.anything()
            );
        });

        it("should handle taskType parameter", async () => {
            const request = {
                model: "text-embedding-3-small",
                input: "test query",
                taskType: "search_query" as const,
                provider: "openai" as const
            };

            await capability.generate(request);

            expect(mockProvider.embed).toHaveBeenCalledWith(
                expect.objectContaining({ taskType: "search_query" }),
                expect.anything()
            );
        });
    });

    describe("generateQuery", () => {
        it("should return single embedding array", async () => {
            mockProvider.embed = vi.fn().mockResolvedValue({
                embeddings: [new Array(1536).fill(0.5)],
                dimensions: 1536,
                metadata: {
                    processingTimeMs: 50,
                    provider: "openai",
                    model: "text-embedding-3-small",
                    inputCount: 1
                }
            } as EmbeddingResponse);

            const embedding = await capability.generateQuery(
                "search query",
                "text-embedding-3-small",
                "openai"
            );

            expect(embedding).toBeInstanceOf(Array);
            expect(embedding.length).toBe(1536);
        });

        it("should use search_query task type", async () => {
            await capability.generateQuery("query", "text-embedding-3-small", "openai");

            expect(mockProvider.embed).toHaveBeenCalledWith(
                expect.objectContaining({ taskType: "search_query" }),
                expect.anything()
            );
        });

        it("should return empty array when no embeddings", async () => {
            mockProvider.embed = vi.fn().mockResolvedValue({
                embeddings: [],
                dimensions: 1536,
                metadata: {
                    processingTimeMs: 50,
                    provider: "openai",
                    model: "text-embedding-3-small",
                    inputCount: 0
                }
            } as EmbeddingResponse);

            const embedding = await capability.generateQuery("query", "text-embedding-3-small");

            expect(embedding).toEqual([]);
        });
    });

    describe("generateDocuments", () => {
        it("should return multiple embeddings", async () => {
            mockProvider.embed = vi.fn().mockResolvedValue({
                embeddings: [new Array(1536).fill(0.1), new Array(1536).fill(0.2)],
                dimensions: 1536,
                metadata: {
                    processingTimeMs: 100,
                    provider: "openai",
                    model: "text-embedding-3-small",
                    inputCount: 2
                }
            } as EmbeddingResponse);

            const embeddings = await capability.generateDocuments(
                ["doc1", "doc2"],
                "text-embedding-3-small",
                "openai"
            );

            expect(embeddings.length).toBe(2);
            expect(embeddings[0].length).toBe(1536);
        });

        it("should use search_document task type", async () => {
            await capability.generateDocuments(["doc"], "text-embedding-3-small", "openai");

            expect(mockProvider.embed).toHaveBeenCalledWith(
                expect.objectContaining({ taskType: "search_document" }),
                expect.anything()
            );
        });
    });

    describe("getAvailableProviders", () => {
        it("should return available embedding providers", () => {
            const providers = capability.getAvailableProviders();

            expect(providers).toContain("openai");
        });

        it("should only include providers with API keys", () => {
            registry.registerEmbeddingProvider("cohere", () => createMockEmbeddingProvider());

            const providers = capability.getAvailableProviders();

            expect(providers).not.toContain("cohere");
        });
    });
});
