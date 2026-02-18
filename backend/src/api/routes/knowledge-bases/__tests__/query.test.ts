/**
 * Knowledge Base Query Operations Tests
 *
 * Tests for Stats endpoint and Semantic query operations.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    mockKnowledgeBaseRepo,
    mockKnowledgeDocumentRepo,
    mockKnowledgeChunkRepo,
    mockEmbeddingService,
    mockGCSStorageService,
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    mockRedisEventBus,
    mockSSEHandler,
    resetAllMocks,
    createTestUser,
    createMockKnowledgeBase,
    createAuthToken,
    createKnowledgeBaseTestServer,
    setupDefaultWorkspaceMocks
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP - Must be before imports that use these modules
// ============================================================================

jest.mock("../../../../storage/repositories", () => ({
    KnowledgeBaseRepository: jest.fn().mockImplementation(() => mockKnowledgeBaseRepo),
    KnowledgeDocumentRepository: jest.fn().mockImplementation(() => mockKnowledgeDocumentRepo),
    KnowledgeChunkRepository: jest.fn().mockImplementation(() => mockKnowledgeChunkRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeBaseRepository", () => ({
    KnowledgeBaseRepository: jest.fn().mockImplementation(() => mockKnowledgeBaseRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeDocumentRepository", () => ({
    KnowledgeDocumentRepository: jest.fn().mockImplementation(() => mockKnowledgeDocumentRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeChunkRepository", () => ({
    KnowledgeChunkRepository: jest.fn().mockImplementation(() => mockKnowledgeChunkRepo)
}));

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
}));

jest.mock("../../../../services/GCSStorageService", () => ({
    getGCSStorageService: jest.fn().mockReturnValue(mockGCSStorageService),
    GCSStorageService: jest.fn().mockImplementation(() => mockGCSStorageService)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockReturnValue({
        workflow: {
            start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
        }
    })
}));

jest.mock("../../../../storage/repositories/WorkspaceRepository", () => ({
    WorkspaceRepository: jest.fn().mockImplementation(() => mockWorkspaceRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceMemberRepository", () => ({
    WorkspaceMemberRepository: jest.fn().mockImplementation(() => mockWorkspaceMemberRepo)
}));

jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: mockRedisEventBus,
    RedisEventBus: {
        getInstance: jest.fn().mockReturnValue(mockRedisEventBus)
    }
}));

jest.mock("../../../../services/sse", () => ({
    createSSEHandler: jest.fn().mockReturnValue(mockSSEHandler)
}));

jest.mock("../../../../core/config", () => ({
    config: {
        jwt: {
            secret: "test-jwt-secret",
            expiresIn: "1h"
        },
        gcs: {
            bucketName: "test-bucket"
        },
        redis: {
            host: "localhost",
            port: 6379
        }
    }
}));

jest.mock("../../../../storage/database", () => ({
    Database: {
        getInstance: jest.fn().mockReturnValue({
            pool: {
                query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
            }
        })
    },
    db: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    },
    pool: {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    }
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Knowledge Base Query Operations", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createKnowledgeBaseTestServer();
        await fastify.ready();
    });

    afterAll(async () => {
        await fastify.close();
    });

    beforeEach(() => {
        resetAllMocks();
        setupDefaultWorkspaceMocks();
    });

    // ========================================================================
    // Get Stats Tests (GET /:id/stats)
    // ========================================================================

    describe("GET /knowledge-bases/:id/stats", () => {
        it("should return knowledge base statistics", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const mockStats = {
                id: mockKb.id,
                name: mockKb.name,
                document_count: 5,
                chunk_count: 150,
                total_size_bytes: 1024000,
                last_updated: new Date()
            };
            mockKnowledgeBaseRepo.getStats.mockResolvedValue(mockStats);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/stats`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.document_count).toBe(5);
            expect(body.data.chunk_count).toBe(150);
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${uuidv4()}/stats`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/stats`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(403);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("denied");
        });
    });

    // ========================================================================
    // Query Knowledge Base Tests (POST /:id/query)
    // ========================================================================

    describe("POST /knowledge-bases/:id/query", () => {
        it("should perform semantic search", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const mockEmbedding = Array(1536).fill(0.1);
            mockEmbeddingService.generateQueryEmbedding.mockResolvedValue(mockEmbedding);

            const mockResults = [
                {
                    id: uuidv4(),
                    document_id: uuidv4(),
                    document_name: "test.pdf",
                    chunk_index: 0,
                    content: "This is relevant content",
                    metadata: {},
                    similarity: 0.85
                },
                {
                    id: uuidv4(),
                    document_id: uuidv4(),
                    document_name: "test2.pdf",
                    chunk_index: 1,
                    content: "Another relevant chunk",
                    metadata: {},
                    similarity: 0.75
                }
            ];
            mockKnowledgeChunkRepo.searchSimilar.mockResolvedValue(mockResults);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    query: "What is the meaning of life?"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.results).toHaveLength(2);
            expect(body.data.query).toBe("What is the meaning of life?");
            expect(body.data.count).toBe(2);
        });

        it("should support custom top_k and similarity_threshold", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockEmbeddingService.generateQueryEmbedding.mockResolvedValue(Array(1536).fill(0.1));
            mockKnowledgeChunkRepo.searchSimilar.mockResolvedValue([]);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    query: "test query",
                    top_k: 5,
                    similarity_threshold: 0.7
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.top_k).toBe(5);
            expect(body.data.similarity_threshold).toBe(0.7);
            expect(mockKnowledgeChunkRepo.searchSimilar).toHaveBeenCalledWith(
                expect.objectContaining({
                    top_k: 5,
                    similarity_threshold: 0.7
                })
            );
        });

        it("should clamp top_k between 1 and 50", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockEmbeddingService.generateQueryEmbedding.mockResolvedValue(Array(1536).fill(0.1));
            mockKnowledgeChunkRepo.searchSimilar.mockResolvedValue([]);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    query: "test",
                    top_k: 100
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.top_k).toBe(50); // Clamped to max
        });

        it("should return 400 for empty query", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    query: "   "
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("required");
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${uuidv4()}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: { query: "test" }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: { query: "test" }
            });

            expect(response.statusCode).toBe(403);
        });

        it("should handle embedding service errors", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockEmbeddingService.generateQueryEmbedding.mockRejectedValue(
                new Error("Embedding service unavailable")
            );

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/query`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: { query: "test" }
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("Embedding service unavailable");
        });
    });

    // ========================================================================
    // Stream Tests (GET /:id/stream)
    // ========================================================================

    describe("GET /knowledge-bases/:id/stream", () => {
        // Note: SSE endpoints return a Promise that never resolves, so we can't
        // easily test the full streaming behavior with Fastify inject().
        // We test auth/ownership validation which happens before the SSE setup.

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${uuidv4()}/stream`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 401 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/stream`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Stream route uses UnauthorizedError (401) for non-owner
            expect(response.statusCode).toBe(401);
        });

        it("should require authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${uuidv4()}/stream`
            });

            expect(response.statusCode).toBe(401);
        });
    });
});
