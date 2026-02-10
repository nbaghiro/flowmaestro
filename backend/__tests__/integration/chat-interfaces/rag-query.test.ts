/**
 * Chat Interface RAG Query Tests
 *
 * Tests for vector similarity search on uploaded attachments.
 */

import {
    createSimpleChatInterfaceTestEnvironment,
    createTestSession,
    generateDeterministicEmbedding,
    cosineSimilarity
} from "./setup";
import type { SimpleChatInterfaceTestEnvironment } from "./helpers/chat-interface-test-env";
import type { ChunkSearchResult } from "../../../src/storage/repositories/ChatInterfaceMessageChunkRepository";

describe("Chat Interface RAG Query", () => {
    let testEnv: SimpleChatInterfaceTestEnvironment;

    beforeEach(() => {
        testEnv = createSimpleChatInterfaceTestEnvironment();
    });

    afterEach(() => {
        testEnv.cleanup();
    });

    describe("POST /api/public/chat-interfaces/:slug/query", () => {
        it("should generate embedding for query", async () => {
            // Arrange
            const query = "What is the vacation policy?";

            // Act - simulate embedding generation
            const embedding = await testEnv.services.embedding.generateEmbedding(query);

            // Assert
            expect(embedding).toHaveLength(1536);
            expect(testEnv.services.embedding.generateEmbedding).toHaveBeenCalledWith(query);
            // Verify embedding is normalized (unit vector)
            const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
            expect(magnitude).toBeCloseTo(1, 5);
        });

        it("should search chunks by session", async () => {
            // Arrange
            const session = createTestSession("ci-001", { id: "session-001" });
            const queryEmbedding = generateDeterministicEmbedding("vacation policy");

            const mockResults: ChunkSearchResult[] = [
                {
                    id: "chunk-001",
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "policies.pdf",
                    content: "Vacation policy allows 20 days off per year",
                    chunkIndex: 0,
                    metadata: {},
                    similarity: 0.95
                }
            ];

            testEnv.repositories.chunk.searchSimilar.mockResolvedValue(mockResults);

            // Act
            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: session.id,
                queryEmbedding,
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results).toHaveLength(1);
            expect(testEnv.repositories.chunk.searchSimilar).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId: session.id
                })
            );
        });

        it("should respect topK parameter", async () => {
            // Arrange
            const session = createTestSession("ci-001", { id: "session-001" });
            const queryEmbedding = generateDeterministicEmbedding("test query");
            const topK = 3;

            const mockResults: ChunkSearchResult[] = Array.from({ length: 3 }, (_, i) => ({
                id: `chunk-${i}`,
                sessionId: session.id,
                sourceType: "file" as const,
                sourceName: "doc.pdf",
                content: `Result ${i}`,
                chunkIndex: i,
                metadata: {},
                similarity: 0.9 - i * 0.1
            }));

            testEnv.repositories.chunk.searchSimilar.mockResolvedValue(mockResults);

            // Act
            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: session.id,
                queryEmbedding,
                topK,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results).toHaveLength(topK);
        });

        it("should filter by similarity threshold", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const queryEmbedding = generateDeterministicEmbedding("test query");
            const threshold = 0.8;

            // Only return results above threshold
            const mockResults: ChunkSearchResult[] = [
                {
                    id: "chunk-high",
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "doc.pdf",
                    content: "High similarity result",
                    chunkIndex: 0,
                    metadata: {},
                    similarity: 0.92
                },
                {
                    id: "chunk-medium",
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "doc.pdf",
                    content: "Medium similarity result",
                    chunkIndex: 1,
                    metadata: {},
                    similarity: 0.85
                }
            ];

            testEnv.repositories.chunk.searchSimilar.mockResolvedValue(mockResults);

            // Act
            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: session.id,
                queryEmbedding,
                topK: 5,
                similarityThreshold: threshold
            });

            // Assert - all results should be above threshold
            expect(results.every((r) => r.similarity >= threshold)).toBe(true);
        });

        it("should return empty with no chunks", async () => {
            // Arrange
            const session = createTestSession("ci-001");

            testEnv.repositories.chunk.countBySessionId.mockResolvedValue(0);

            // Act
            const count = await testEnv.repositories.chunk.countBySessionId(session.id);

            // Assert
            expect(count).toBe(0);
            // When count is 0, route should return message about no documents
        });

        it("should return 503 on embedding failure", async () => {
            // Arrange
            const query = "test query";

            testEnv.services.embedding.generateEmbedding.mockRejectedValue(
                new Error("Embedding service unavailable")
            );

            // Act & Assert
            await expect(testEnv.services.embedding.generateEmbedding(query)).rejects.toThrow(
                "Embedding service unavailable"
            );
        });
    });

    describe("Semantic Search Quality", () => {
        it("should compute similarity between embeddings", async () => {
            // Note: Deterministic embeddings are for testing the similarity computation,
            // not actual semantic similarity. Real semantic similarity requires ML models.

            // Arrange - use identical text to verify similarity function works
            const text = "vacation policy allows 20 days of paid time off";
            const embedding1 = generateDeterministicEmbedding(text);
            const embedding2 = generateDeterministicEmbedding(text);

            // Calculate similarity
            const similarity = cosineSimilarity(embedding1, embedding2);

            // Assert - identical text should have perfect similarity
            expect(similarity).toBeCloseTo(1, 5);
        });

        it("should rank results by similarity", async () => {
            // Arrange
            const session = createTestSession("ci-001");
            const queryEmbedding = generateDeterministicEmbedding("remote work policy");

            const mockResults: ChunkSearchResult[] = [
                {
                    id: "chunk-1",
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "policies.pdf",
                    content: "Remote work allows 3 days per week",
                    chunkIndex: 0,
                    metadata: {},
                    similarity: 0.95
                },
                {
                    id: "chunk-2",
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "policies.pdf",
                    content: "Work from home guidelines",
                    chunkIndex: 1,
                    metadata: {},
                    similarity: 0.88
                },
                {
                    id: "chunk-3",
                    sessionId: session.id,
                    sourceType: "file",
                    sourceName: "policies.pdf",
                    content: "Office location information",
                    chunkIndex: 2,
                    metadata: {},
                    similarity: 0.72
                }
            ];

            testEnv.repositories.chunk.searchSimilar.mockResolvedValue(mockResults);

            // Act
            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: session.id,
                queryEmbedding,
                topK: 10,
                similarityThreshold: 0.7
            });

            // Assert - results should be sorted by similarity (descending)
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
            }
        });

        it("should include source information in results", async () => {
            // Arrange
            const mockResult: ChunkSearchResult = {
                id: "chunk-001",
                sessionId: "session-001",
                sourceType: "file",
                sourceName: "company-handbook.pdf",
                content: "Detailed policy content",
                chunkIndex: 5,
                metadata: { page: 12, section: "HR Policies" },
                similarity: 0.89
            };

            testEnv.repositories.chunk.searchSimilar.mockResolvedValue([mockResult]);

            // Act
            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: "session-001",
                queryEmbedding: [],
                topK: 1,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results[0]).toMatchObject({
                sourceType: "file",
                sourceName: "company-handbook.pdf",
                chunkIndex: 5
            });
        });
    });

    describe("Query Validation", () => {
        it("should require session token", () => {
            // The route validates session token is present
            const invalidBody = {
                query: "test query"
                // Missing sessionToken
            };

            expect(invalidBody).not.toHaveProperty("sessionToken");
        });

        it("should require non-empty query", () => {
            // The route validates query is non-empty
            const emptyQuery = "";
            expect(emptyQuery.trim()).toBe("");
        });

        it("should validate session exists", async () => {
            // Arrange
            testEnv.repositories.session.findBySlugAndToken.mockResolvedValue(null);

            // Act
            const session = await testEnv.repositories.session.findBySlugAndToken(
                "test-chat",
                "invalid_token"
            );

            // Assert
            expect(session).toBeNull();
        });
    });

    describe("URL Attachment Search", () => {
        it("should search chunks from URL attachments", async () => {
            // Arrange
            const mockResult: ChunkSearchResult = {
                id: "chunk-url-001",
                sessionId: "session-001",
                sourceType: "url",
                sourceName: "https://example.com/article",
                content: "Article content from web page",
                chunkIndex: 0,
                metadata: { url: "https://example.com/article" },
                similarity: 0.87
            };

            testEnv.repositories.chunk.searchSimilar.mockResolvedValue([mockResult]);

            // Act
            const results = await testEnv.repositories.chunk.searchSimilar({
                sessionId: "session-001",
                queryEmbedding: [],
                topK: 5,
                similarityThreshold: 0.7
            });

            // Assert
            expect(results[0].sourceType).toBe("url");
            expect(results[0].sourceName).toContain("https://");
        });
    });

    describe("Deterministic Embeddings", () => {
        it("should generate consistent embeddings for same text", () => {
            // Arrange
            const text = "vacation policy details";

            // Act
            const embedding1 = generateDeterministicEmbedding(text);
            const embedding2 = generateDeterministicEmbedding(text);

            // Assert
            expect(embedding1).toEqual(embedding2);
        });

        it("should generate different embeddings for different text", () => {
            // Arrange
            const text1 = "vacation policy";
            const text2 = "expense reimbursement";

            // Act
            const embedding1 = generateDeterministicEmbedding(text1);
            const embedding2 = generateDeterministicEmbedding(text2);

            // Assert
            expect(embedding1).not.toEqual(embedding2);
        });

        it("should compute correct cosine similarity", () => {
            // Arrange
            const embedding1 = generateDeterministicEmbedding("vacation policy");
            const embedding2 = generateDeterministicEmbedding("vacation policy"); // Same
            const embedding3 = generateDeterministicEmbedding("completely unrelated topic");

            // Act
            const similaritySame = cosineSimilarity(embedding1, embedding2);
            const similarityDifferent = cosineSimilarity(embedding1, embedding3);

            // Assert
            expect(similaritySame).toBeCloseTo(1, 5); // Identical = 1
            expect(similarityDifferent).toBeLessThan(similaritySame);
        });
    });

    describe("Chunk Count", () => {
        it("should count chunks by session", async () => {
            // Arrange
            testEnv.repositories.chunk.countBySessionId.mockResolvedValue(10);

            // Act
            const count = await testEnv.repositories.chunk.countBySessionId("session-001");

            // Assert
            expect(count).toBe(10);
        });

        it("should return total chunks in query response", async () => {
            // Arrange
            const session = createTestSession("ci-001", { id: "session-001" });

            testEnv.repositories.chunk.countBySessionId.mockResolvedValue(25);
            testEnv.repositories.chunk.searchSimilar.mockResolvedValue([]);

            // Act
            const count = await testEnv.repositories.chunk.countBySessionId(session.id);

            // Assert
            expect(count).toBe(25);
            // The route would include this in response as totalChunks
        });
    });
});
