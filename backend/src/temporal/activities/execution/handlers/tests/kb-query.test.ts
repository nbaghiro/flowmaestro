/**
 * Knowledge Base Query Node Handler Unit Tests
 *
 * Tests semantic search on knowledge bases:
 * - Config validation (knowledgeBaseId, queryText)
 * - Embedding generation for queries
 * - Similarity search results
 * - Result formatting (metadata inclusion)
 * - Combined text output for LLM prompts
 * - Error handling
 */

import {
    createHandlerInput,
    assertValidOutput
} from "../../../../../../tests/helpers/handler-test-utils";
import { KnowledgeBaseQueryNodeHandler, createKnowledgeBaseQueryNodeHandler } from "../ai/kb-query";

// Mock the repositories
const mockFindById = jest.fn();
const mockSearchSimilar = jest.fn();
const mockGenerateQueryEmbedding = jest.fn();

jest.mock("../../../../../storage/repositories", () => ({
    KnowledgeBaseRepository: jest.fn().mockImplementation(() => ({
        findById: mockFindById
    })),
    KnowledgeChunkRepository: jest.fn().mockImplementation(() => ({
        searchSimilar: mockSearchSimilar
    }))
}));

jest.mock("../../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => ({
        generateQueryEmbedding: mockGenerateQueryEmbedding
    }))
}));

describe("KnowledgeBaseQueryNodeHandler", () => {
    let handler: KnowledgeBaseQueryNodeHandler;

    const mockKnowledgeBase = {
        id: "kb-123",
        name: "Product Documentation",
        config: {
            embeddingModel: "text-embedding-3-small",
            embeddingProvider: "openai",
            embeddingDimensions: 1536
        }
    };

    const mockSearchResults = [
        {
            content: "The product supports automatic scaling up to 100 instances.",
            similarity: 0.95,
            document_name: "scaling-guide.pdf",
            chunk_index: 3,
            metadata: { section: "Scaling", page: 12 }
        },
        {
            content: "Horizontal scaling is recommended for high availability.",
            similarity: 0.89,
            document_name: "scaling-guide.pdf",
            chunk_index: 5,
            metadata: { section: "Best Practices", page: 15 }
        },
        {
            content: "You can configure scaling policies in the dashboard.",
            similarity: 0.82,
            document_name: "admin-guide.pdf",
            chunk_index: 8,
            metadata: { section: "Configuration", page: 42 }
        }
    ];

    const mockEmbedding = new Array(1536).fill(0.1);

    beforeEach(() => {
        handler = createKnowledgeBaseQueryNodeHandler();
        jest.clearAllMocks();

        // Default successful mock responses
        mockFindById.mockResolvedValue(mockKnowledgeBase);
        mockSearchSimilar.mockResolvedValue(mockSearchResults);
        mockGenerateQueryEmbedding.mockResolvedValue(mockEmbedding);
    });

    describe("handler properties", () => {
        it("has correct name", () => {
            expect(handler.name).toBe("KnowledgeBaseQueryNodeHandler");
        });

        it("supports kbQuery and knowledgeBaseQuery node types", () => {
            expect(handler.supportedNodeTypes).toContain("kbQuery");
            expect(handler.supportedNodeTypes).toContain("knowledgeBaseQuery");
        });

        it("can handle kbQuery type", () => {
            expect(handler.canHandle("kbQuery")).toBe(true);
            expect(handler.canHandle("knowledgeBaseQuery")).toBe(true);
        });

        it("cannot handle other types", () => {
            expect(handler.canHandle("llm")).toBe(false);
            expect(handler.canHandle("embeddings")).toBe(false);
            expect(handler.canHandle("search")).toBe(false);
        });
    });

    describe("successful query", () => {
        it("returns search results with similarity scores", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "How does scaling work?"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.success).toBe(true);

            const data = output.result.data as {
                results: Array<{ content: string; similarity: number }>;
                count: number;
            };
            expect(data.results).toHaveLength(3);
            expect(data.count).toBe(3);
            expect(data.results[0].similarity).toBe(0.95);
        });

        it("includes query in result", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "What are the best practices?"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as { query: string };
            expect(data.query).toBe("What are the best practices?");
        });

        it("provides topResult for convenience", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Scaling info"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as {
                topResult: { content: string; similarity: number };
            };
            expect(data.topResult).toBeDefined();
            expect(data.topResult.content).toBe(
                "The product supports automatic scaling up to 100 instances."
            );
            expect(data.topResult.similarity).toBe(0.95);
        });

        it("generates combinedText for LLM prompts", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Scaling"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as { combinedText: string };
            expect(data.combinedText).toBeDefined();
            expect(data.combinedText).toContain("Result 1");
            expect(data.combinedText).toContain("0.950");
            expect(data.combinedText).toContain("[Source: scaling-guide.pdf");
        });

        it("includes knowledge base metadata", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as {
                metadata: { knowledgeBaseId: string; knowledgeBaseName: string };
            };
            expect(data.metadata.knowledgeBaseId).toBe("kb-123");
            expect(data.metadata.knowledgeBaseName).toBe("Product Documentation");
        });
    });

    describe("metadata inclusion", () => {
        it("includes chunk metadata by default", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as {
                results: Array<{ metadata?: Record<string, unknown> }>;
            };
            expect(data.results[0].metadata).toBeDefined();
            expect(data.results[0].metadata?.section).toBe("Scaling");
        });

        it("excludes chunk metadata when includeMetadata is false", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query",
                    includeMetadata: false
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as {
                results: Array<{ metadata?: Record<string, unknown> }>;
            };
            expect(data.results[0].metadata).toBeUndefined();
        });
    });

    describe("output variable", () => {
        it("stores result in outputVariable when specified", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query",
                    outputVariable: "searchResults"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.searchResults).toBeDefined();
            const searchResults = output.result.searchResults as { success: boolean };
            expect(searchResults.success).toBe(true);
        });
    });

    describe("empty results", () => {
        it("handles no matching results", async () => {
            mockSearchSimilar.mockResolvedValue([]);

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Completely unrelated query"
                }
            });

            const output = await handler.execute(input);

            assertValidOutput(output);
            expect(output.result.success).toBe(true);

            const data = output.result.data as {
                results: Array<unknown>;
                topResult: unknown;
                count: number;
                combinedText: string;
            };
            expect(data.results).toHaveLength(0);
            expect(data.topResult).toBeNull();
            expect(data.count).toBe(0);
            expect(data.combinedText).toBe("");
        });
    });

    describe("validation errors", () => {
        it("fails when knowledgeBaseId is missing", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    queryText: "Query"
                    // knowledgeBaseId missing
                }
            });

            const output = await handler.execute(input);

            expect(output.result.success).toBe(false);
            expect(output.result.error).toContain("Knowledge base ID is required");
        });

        it("fails when queryText is missing", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123"
                    // queryText missing
                }
            });

            const output = await handler.execute(input);

            expect(output.result.success).toBe(false);
            expect(output.result.error).toContain("Query text is required");
        });

        it("fails when queryText is empty", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "   "
                }
            });

            const output = await handler.execute(input);

            expect(output.result.success).toBe(false);
            expect(output.result.error).toContain("Query text is empty");
        });

        it("fails when knowledge base not found", async () => {
            mockFindById.mockResolvedValue(null);

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "non-existent-kb",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.success).toBe(false);
            expect(output.result.error).toContain("Knowledge base not found");
        });
    });

    describe("embedding generation", () => {
        it("generates embedding with correct parameters", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "How do I configure scaling?"
                }
            });

            await handler.execute(input);

            expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith("How do I configure scaling?", {
                model: "text-embedding-3-small",
                provider: "openai",
                dimensions: 1536
            });
        });

        it("handles embedding generation failure", async () => {
            mockGenerateQueryEmbedding.mockRejectedValue(new Error("Embedding API error"));

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.success).toBe(false);
            expect(output.result.error).toContain("Embedding API error");
        });
    });

    describe("similarity search", () => {
        it("calls searchSimilar with correct parameters", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            await handler.execute(input);

            expect(mockSearchSimilar).toHaveBeenCalledWith({
                knowledge_base_id: "kb-123",
                query_embedding: mockEmbedding,
                top_k: 5,
                similarity_threshold: 0.7
            });
        });

        it("handles search failure", async () => {
            mockSearchSimilar.mockRejectedValue(new Error("Database connection error"));

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.success).toBe(false);
            expect(output.result.error).toContain("Database connection error");
        });
    });

    describe("result formatting", () => {
        it("includes document name and chunk index", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as {
                results: Array<{ documentName?: string; chunkIndex?: number }>;
            };
            expect(data.results[0].documentName).toBe("scaling-guide.pdf");
            expect(data.results[0].chunkIndex).toBe(3);
        });

        it("handles results without document names", async () => {
            mockSearchSimilar.mockResolvedValue([
                {
                    content: "Some content",
                    similarity: 0.9,
                    chunk_index: 0,
                    metadata: {}
                }
            ]);

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            const data = output.result.data as {
                results: Array<{ documentName?: string }>;
                combinedText: string;
            };
            expect(data.results[0].documentName).toBeUndefined();
            // combinedText should not include source info when document name is missing
            expect(data.combinedText).not.toContain("[Source:");
        });
    });

    describe("error output variable", () => {
        it("stores error in outputVariable when specified", async () => {
            mockFindById.mockResolvedValue(null);

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "non-existent",
                    queryText: "Query",
                    outputVariable: "queryResult"
                }
            });

            const output = await handler.execute(input);

            expect(output.result.queryResult).toBeDefined();
            const queryResult = output.result.queryResult as { success: boolean; error: string };
            expect(queryResult.success).toBe(false);
            expect(queryResult.error).toContain("Knowledge base not found");
        });
    });

    describe("metrics", () => {
        it("records execution duration", async () => {
            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-123",
                    queryText: "Query"
                }
            });

            const output = await handler.execute(input);

            expect(output.metrics).toBeDefined();
            expect(output.metrics?.durationMs).toBeGreaterThanOrEqual(0);
        });
    });

    describe("different knowledge base configurations", () => {
        it("handles different embedding providers", async () => {
            mockFindById.mockResolvedValue({
                id: "kb-456",
                name: "Cohere KB",
                config: {
                    embeddingModel: "embed-english-v3.0",
                    embeddingProvider: "cohere",
                    embeddingDimensions: 1024
                }
            });

            const input = createHandlerInput({
                nodeType: "kbQuery",
                nodeConfig: {
                    knowledgeBaseId: "kb-456",
                    queryText: "Query"
                }
            });

            await handler.execute(input);

            expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith("Query", {
                model: "embed-english-v3.0",
                provider: "cohere",
                dimensions: 1024
            });
        });
    });
});
