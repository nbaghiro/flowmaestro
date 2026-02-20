/**
 * v1 Knowledge Bases Route Tests
 *
 * Tests for knowledge base CRUD and query endpoints.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    parseResponse,
    mockKnowledgeBaseRepo,
    mockKnowledgeChunkRepo,
    mockEmbeddingService,
    TEST_API_KEY_USER_ID
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/KnowledgeBaseRepository", () => ({
    KnowledgeBaseRepository: jest.fn().mockImplementation(() => mockKnowledgeBaseRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeChunkRepository", () => ({
    KnowledgeChunkRepository: jest.fn().mockImplementation(() => mockKnowledgeChunkRepo)
}));

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
}));

describe("v1 Knowledge Bases Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockApiKey();
    });

    describe("GET /api/v1/knowledge-bases", () => {
        it("should list knowledge bases", async () => {
            mockKnowledgeBaseRepo.findByUserId.mockResolvedValue({
                knowledgeBases: [
                    {
                        id: "kb-1",
                        name: "Test KB",
                        description: "A test knowledge base",
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                ],
                total: 1
            });
            mockKnowledgeBaseRepo.getStats.mockResolvedValue({
                document_count: 5,
                chunk_count: 100
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/knowledge-bases"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].document_count).toBe(5);
        });
    });

    describe("GET /api/v1/knowledge-bases/:id", () => {
        it("should get knowledge base by ID", async () => {
            mockKnowledgeBaseRepo.findById.mockResolvedValue({
                id: "kb-1",
                name: "Test KB",
                description: "A test knowledge base",
                user_id: TEST_API_KEY_USER_ID,
                config: {
                    embeddingModel: "text-embedding-3-small",
                    chunkSize: 500,
                    chunkOverlap: 50
                },
                created_at: new Date(),
                updated_at: new Date()
            });
            mockKnowledgeBaseRepo.getStats.mockResolvedValue({
                document_count: 5,
                chunk_count: 100
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/knowledge-bases/kb-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.id).toBe("kb-1");
            expect(body.data.embedding_model).toBe("text-embedding-3-small");
        });

        it("should return 404 for non-existent knowledge base", async () => {
            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/knowledge-bases/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/knowledge-bases/:id/query", () => {
        it("should perform semantic search", async () => {
            mockKnowledgeBaseRepo.findById.mockResolvedValue({
                id: "kb-1",
                user_id: TEST_API_KEY_USER_ID,
                config: {
                    embeddingModel: "text-embedding-3-small",
                    embeddingProvider: "openai",
                    embeddingDimensions: 1536
                }
            });
            mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                embeddings: [[0.1, 0.2, 0.3]]
            });
            mockKnowledgeChunkRepo.searchSimilar.mockResolvedValue([
                {
                    id: "chunk-1",
                    content: "Relevant content",
                    document_id: "doc-1",
                    document_name: "test.pdf",
                    similarity: 0.95,
                    metadata: {}
                }
            ]);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/knowledge-bases/kb-1/query",
                payload: { query: "test query", top_k: 5 }
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.results).toHaveLength(1);
            expect(body.data.results[0].score).toBe(0.95);
        });

        it("should reject empty query", async () => {
            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/knowledge-bases/kb-1/query",
                payload: {}
            });

            expect(response.statusCode).toBe(400);
        });

        it("should return 404 for non-existent knowledge base", async () => {
            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/knowledge-bases/non-existent/query",
                payload: { query: "test" }
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
