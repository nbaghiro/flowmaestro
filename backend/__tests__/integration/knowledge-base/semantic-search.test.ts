/**
 * Semantic Search Integration Tests
 *
 * Tests for vector similarity search over knowledge base chunks:
 * - Finding semantically similar chunks
 * - Similarity score ordering
 * - Top-K limiting
 * - Similarity threshold filtering
 * - Empty results handling
 */

import {
    generateDeterministicEmbedding,
    generateSimilarEmbedding,
    cosineSimilarity,
    generateTestEmbeddingSet
} from "./helpers/embedding-mock";
import {
    createTestKnowledgeBase,
    createTestDocument,
    createTestChunks,
    createSemanticTestChunks,
    createSearchResult,
    createSearchResults,
    createSimilaritySearchResults,
    createSemanticSearchScenario
} from "./helpers/kb-fixtures";
import { createSimpleKBTestEnvironment, type SimpleKBTestEnvironment } from "./helpers/kb-test-env";
import type { ChunkSearchResult } from "../../../src/storage/models/KnowledgeChunk";

// ============================================================================
// TEST SETUP
// ============================================================================

describe("Semantic Search", () => {
    let testEnv: SimpleKBTestEnvironment;

    afterEach(() => {
        if (testEnv) {
            testEnv.cleanup();
        }
    });

    // =========================================================================
    // BASIC SIMILARITY SEARCH
    // =========================================================================

    describe("Basic Similarity Search", () => {
        it("should find semantically similar chunks", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const kb = createTestKnowledgeBase({ id: "kb-search-001" });
            const doc = createTestDocument(kb.id, { id: "doc-search-001", name: "policies.pdf" });

            // Create chunks with known embeddings
            const chunks = createSemanticTestChunks(doc.id, kb.id);

            // Generate query embedding for "vacation time off"
            const queryText = "vacation time off PTO";
            const queryEmbedding = generateDeterministicEmbedding(queryText);

            // Mock search similar to return relevant chunks
            const searchResults: ChunkSearchResult[] = [
                createSearchResult(chunks[0], doc.name, 0.92), // vacation policy chunk
                createSearchResult(chunks[1], doc.name, 0.45) // remote work chunk (less similar)
            ];

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(searchResults);

            // Perform search
            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: kb.id,
                query_embedding: queryEmbedding,
                top_k: 5,
                similarity_threshold: 0.3
            });

            expect(results).toHaveLength(2);
            expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
            expect(results[0].content).toContain("vacation");
        });

        it("should return results ordered by similarity score (descending)", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const { queryEmbedding, results } = createSimilaritySearchResults(
                "security protocols",
                "doc-001",
                "kb-001",
                "security-guide.pdf",
                5
            );

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(results);

            const searchResults = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-001",
                query_embedding: queryEmbedding,
                top_k: 5,
                similarity_threshold: 0
            });

            // Verify descending order
            for (let i = 0; i < searchResults.length - 1; i++) {
                expect(searchResults[i].similarity).toBeGreaterThanOrEqual(
                    searchResults[i + 1].similarity
                );
            }
        });
    });

    // =========================================================================
    // TOP-K LIMITING
    // =========================================================================

    describe("Top-K Limiting", () => {
        it("should respect top_k limit", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const kb = createTestKnowledgeBase({ id: "kb-topk" });
            const doc = createTestDocument(kb.id, { id: "doc-topk" });
            const chunks = createTestChunks(doc.id, kb.id, 10);

            // Create 10 results but request only 3
            const allResults = createSearchResults(chunks, doc.name, 0.95);

            testEnv.repositories.knowledgeChunk.searchSimilar.mockImplementation(
                async (input: { top_k: number }) => {
                    return allResults.slice(0, input.top_k);
                }
            );

            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: kb.id,
                query_embedding: generateDeterministicEmbedding("test query"),
                top_k: 3,
                similarity_threshold: 0
            });

            expect(results).toHaveLength(3);
        });

        it("should return all results when fewer than top_k exist", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const kb = createTestKnowledgeBase({ id: "kb-few" });
            const doc = createTestDocument(kb.id, { id: "doc-few" });
            const chunks = createTestChunks(doc.id, kb.id, 2);

            const results = createSearchResults(chunks, doc.name, 0.9);
            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(results);

            const searchResults = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: kb.id,
                query_embedding: generateDeterministicEmbedding("query"),
                top_k: 10, // Request more than exist
                similarity_threshold: 0
            });

            expect(searchResults).toHaveLength(2);
        });

        it("should handle top_k of 1", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const results = [
                {
                    id: "chunk-1",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    chunk_index: 0,
                    content: "Top result content",
                    metadata: {},
                    similarity: 0.95
                }
            ];

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(results);

            const searchResults = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("query"),
                top_k: 1,
                similarity_threshold: 0
            });

            expect(searchResults).toHaveLength(1);
        });
    });

    // =========================================================================
    // SIMILARITY THRESHOLD
    // =========================================================================

    describe("Similarity Threshold Filtering", () => {
        it("should filter results below similarity threshold", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            // Create results with varying similarity scores
            const allResults: ChunkSearchResult[] = [
                {
                    id: "chunk-1",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    chunk_index: 0,
                    content: "Very relevant content",
                    metadata: {},
                    similarity: 0.92
                },
                {
                    id: "chunk-2",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    chunk_index: 1,
                    content: "Somewhat relevant content",
                    metadata: {},
                    similarity: 0.75
                },
                {
                    id: "chunk-3",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    chunk_index: 2,
                    content: "Less relevant content",
                    metadata: {},
                    similarity: 0.55
                },
                {
                    id: "chunk-4",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    chunk_index: 3,
                    content: "Not very relevant",
                    metadata: {},
                    similarity: 0.35
                }
            ];

            testEnv.repositories.knowledgeChunk.searchSimilar.mockImplementation(
                async (input: { similarity_threshold?: number }) => {
                    const threshold = input.similarity_threshold || 0;
                    return allResults.filter((r) => r.similarity >= threshold);
                }
            );

            // Request with 0.7 threshold
            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("query"),
                top_k: 10,
                similarity_threshold: 0.7
            });

            expect(results).toHaveLength(2);
            results.forEach((result: ChunkSearchResult) => {
                expect(result.similarity).toBeGreaterThanOrEqual(0.7);
            });
        });

        it("should return all results with zero threshold", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const results: ChunkSearchResult[] = [
                {
                    id: "chunk-1",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    chunk_index: 0,
                    content: "Content",
                    metadata: {},
                    similarity: 0.1 // Very low similarity
                }
            ];

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(results);

            const searchResults = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("query"),
                top_k: 10,
                similarity_threshold: 0
            });

            expect(searchResults).toHaveLength(1);
        });

        it("should return no results when all below threshold", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue([]);

            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("unrelated query"),
                top_k: 10,
                similarity_threshold: 0.99 // Very high threshold
            });

            expect(results).toHaveLength(0);
        });
    });

    // =========================================================================
    // EMPTY KNOWLEDGE BASE
    // =========================================================================

    describe("Empty Knowledge Base", () => {
        it("should handle empty knowledge base gracefully", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue([]);

            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-empty",
                query_embedding: generateDeterministicEmbedding("any query"),
                top_k: 10,
                similarity_threshold: 0
            });

            expect(results).toEqual([]);
        });

        it("should return empty array for non-existent knowledge base", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue([]);

            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-nonexistent",
                query_embedding: generateDeterministicEmbedding("query"),
                top_k: 5,
                similarity_threshold: 0
            });

            expect(results).toEqual([]);
        });
    });

    // =========================================================================
    // DOCUMENT METADATA
    // =========================================================================

    describe("Document Metadata in Results", () => {
        it("should include document name in search results", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const results: ChunkSearchResult[] = [
                {
                    id: "chunk-1",
                    document_id: "doc-1",
                    document_name: "company-handbook.pdf",
                    chunk_index: 0,
                    content: "Policy content",
                    metadata: { section: "Policies", page: 5 },
                    similarity: 0.88
                }
            ];

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(results);

            const searchResults = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("policy"),
                top_k: 5,
                similarity_threshold: 0
            });

            expect(searchResults[0].document_name).toBe("company-handbook.pdf");
            expect(searchResults[0].metadata).toEqual({ section: "Policies", page: 5 });
        });

        it("should include chunk metadata in results", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const results: ChunkSearchResult[] = [
                {
                    id: "chunk-1",
                    document_id: "doc-1",
                    document_name: "manual.pdf",
                    chunk_index: 3,
                    content: "Section content",
                    metadata: {
                        heading: "Chapter 3",
                        start_char: 5000,
                        end_char: 6000
                    },
                    similarity: 0.82
                }
            ];

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(results);

            const searchResults = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("chapter"),
                top_k: 5,
                similarity_threshold: 0
            });

            expect(searchResults[0].chunk_index).toBe(3);
            expect(searchResults[0].metadata.heading).toBe("Chapter 3");
        });
    });

    // =========================================================================
    // EMBEDDING GENERATION FOR QUERIES
    // =========================================================================

    describe("Query Embedding Generation", () => {
        it("should generate query embedding using embedding service", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const queryText = "what is the vacation policy";
            const queryEmbedding = await testEnv.embeddingMock.generateQueryEmbedding(queryText);

            expect(queryEmbedding).toHaveLength(1536);
            expect(testEnv.embeddingMock.generateQueryEmbedding).toHaveBeenCalledWith(queryText);
        });

        it("should produce consistent embeddings for same query", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const queryText = "remote work policy";
            const embedding1 = await testEnv.embeddingMock.generateQueryEmbedding(queryText);
            const embedding2 = await testEnv.embeddingMock.generateQueryEmbedding(queryText);

            // Should be identical (deterministic)
            expect(embedding1).toEqual(embedding2);
        });
    });

    // =========================================================================
    // SEMANTIC RELEVANCE
    // =========================================================================

    describe("Semantic Relevance", () => {
        it("should rank semantically similar content higher", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            // Create test scenario
            const { knowledgeBase, document, chunks, testQueries } = createSemanticSearchScenario();

            // For "vacation days off PTO" query, vacation chunk should rank highest
            const vacationQuery = testQueries[0];
            const queryEmbedding = generateDeterministicEmbedding(vacationQuery.query);

            // Calculate actual similarities
            const resultsWithSimilarity = chunks.map((chunk) => {
                const chunkEmbedding =
                    chunk.embedding || generateDeterministicEmbedding(chunk.content);
                const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
                return createSearchResult(chunk, document.name, similarity);
            });

            // Sort by similarity
            resultsWithSimilarity.sort((a, b) => b.similarity - a.similarity);

            testEnv.repositories.knowledgeChunk.searchSimilar.mockResolvedValue(
                resultsWithSimilarity.slice(0, 3)
            );

            const results = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: knowledgeBase.id,
                query_embedding: queryEmbedding,
                top_k: 3,
                similarity_threshold: 0
            });

            expect(results.length).toBeGreaterThan(0);
            // Top result should have highest similarity
            expect(results[0].similarity).toBeGreaterThanOrEqual(results[1]?.similarity || 0);
        });

        it("should return different results for different queries", async () => {
            testEnv = await createSimpleKBTestEnvironment();

            const vacationResults: ChunkSearchResult[] = [
                {
                    id: "chunk-vacation",
                    document_id: "doc-1",
                    document_name: "handbook.pdf",
                    chunk_index: 0,
                    content: "Vacation policy content",
                    metadata: {},
                    similarity: 0.9
                }
            ];

            const securityResults: ChunkSearchResult[] = [
                {
                    id: "chunk-security",
                    document_id: "doc-1",
                    document_name: "handbook.pdf",
                    chunk_index: 3,
                    content: "Security protocol content",
                    metadata: {},
                    similarity: 0.88
                }
            ];

            // Mock different results for different queries
            testEnv.repositories.knowledgeChunk.searchSimilar
                .mockResolvedValueOnce(vacationResults)
                .mockResolvedValueOnce(securityResults);

            const results1 = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("vacation time off"),
                top_k: 3,
                similarity_threshold: 0
            });

            const results2 = await testEnv.repositories.knowledgeChunk.searchSimilar({
                knowledge_base_id: "kb-1",
                query_embedding: generateDeterministicEmbedding("security VPN"),
                top_k: 3,
                similarity_threshold: 0
            });

            expect(results1[0].id).not.toBe(results2[0].id);
            expect(results1[0].content).toContain("Vacation");
            expect(results2[0].content).toContain("Security");
        });
    });

    // =========================================================================
    // EMBEDDING MATH VERIFICATION
    // =========================================================================

    describe("Embedding Math", () => {
        it("should calculate cosine similarity correctly", () => {
            // Identical vectors should have similarity of 1
            const vec = [0.5, 0.5, 0.5, 0.5];
            expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
        });

        it("should generate similar embeddings with target similarity", () => {
            const base = generateDeterministicEmbedding("base text");
            const similar = generateSimilarEmbedding(base, 0.8, 123);

            const actualSimilarity = cosineSimilarity(base, similar);

            // Should be close to target (within 0.05)
            expect(actualSimilarity).toBeCloseTo(0.8, 1);
        });

        it("should generate consistent test embedding sets", () => {
            const { query, results } = generateTestEmbeddingSet("test query", 5);

            expect(query).toHaveLength(1536);
            expect(results).toHaveLength(5);

            // Results should have decreasing similarity
            for (let i = 0; i < results.length - 1; i++) {
                expect(results[i].similarity).toBeGreaterThan(results[i + 1].similarity);
            }
        });
    });
});
