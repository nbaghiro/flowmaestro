/**
 * Knowledge Base Document Management Tests
 *
 * Tests for List, Download, Reprocess, and Delete document operations.
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
    createMockDocument,
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

describe("Knowledge Base Document Management", () => {
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
    // List Documents Tests (GET /:id/documents)
    // ========================================================================

    describe("GET /knowledge-bases/:id/documents", () => {
        it("should list documents for knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const mockDocs = [
                createMockDocument({ knowledge_base_id: mockKb.id, name: "doc1.pdf" }),
                createMockDocument({ knowledge_base_id: mockKb.id, name: "doc2.txt" })
            ];
            mockKnowledgeDocumentRepo.findByKnowledgeBaseId.mockResolvedValue({
                documents: mockDocs,
                total: 2
            });

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
            expect(body.pagination.total).toBe(2);
        });

        it("should support pagination and status filter", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findByKnowledgeBaseId.mockResolvedValue({
                documents: [],
                total: 0
            });

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents?limit=10&offset=5&status=ready`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockKnowledgeDocumentRepo.findByKnowledgeBaseId).toHaveBeenCalledWith(
                mockKb.id,
                expect.objectContaining({
                    limit: 10,
                    offset: 5,
                    status: "ready"
                })
            );
        });

        it("should return 403 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(403);
        });
    });

    // ========================================================================
    // Download Document Tests (GET /:id/documents/:docId/download)
    // ========================================================================

    describe("GET /knowledge-bases/:id/documents/:docId/download", () => {
        it("should generate signed download URL for file documents", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                source_type: "file",
                file_path: "knowledge-bases/test/doc.pdf",
                name: "test-doc.pdf"
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);
            mockGCSStorageService.getSignedDownloadUrl.mockResolvedValue(
                "https://storage.googleapis.com/signed-url-for-download"
            );

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}/download`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.url).toBe("https://storage.googleapis.com/signed-url-for-download");
            expect(body.data.filename).toBe("test-doc.pdf");
            expect(mockGCSStorageService.getSignedDownloadUrl).toHaveBeenCalledWith(
                mockDoc.file_path,
                expect.any(Number) // expiresIn
            );
        });

        it("should reject download for URL documents", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                source_type: "url",
                source_url: "https://example.com/article",
                file_path: null
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}/download`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("Cannot download URL-based documents");
        });

        it("should return 404 for non-existent document", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents/${uuidv4()}/download`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 404 if document belongs to different KB", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const otherKbId = uuidv4();
            const mockDoc = createMockDocument({
                knowledge_base_id: otherKbId,
                source_type: "file"
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}/download`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("not found");
        });

        it("should return 403 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}/documents/${uuidv4()}/download`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(403);
        });
    });

    // ========================================================================
    // Reprocess Document Tests (POST /:id/documents/:docId/reprocess)
    // ========================================================================

    describe("POST /knowledge-bases/:id/documents/:docId/reprocess", () => {
        it("should reprocess document successfully", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                status: "failed",
                error_message: "Previous processing failed"
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);
            mockKnowledgeChunkRepo.deleteByDocumentId.mockResolvedValue(10);
            mockKnowledgeDocumentRepo.updateStatus.mockResolvedValue(mockDoc);
            mockKnowledgeDocumentRepo.update.mockResolvedValue(mockDoc);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}/reprocess`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.message).toContain("reprocessing started");
            expect(body.data.documentId).toBe(mockDoc.id);
            expect(body.data.workflowId).toBeDefined();

            // Verify cleanup happened
            expect(mockKnowledgeChunkRepo.deleteByDocumentId).toHaveBeenCalledWith(mockDoc.id);
            expect(mockKnowledgeDocumentRepo.updateStatus).toHaveBeenCalledWith(
                mockDoc.id,
                "pending"
            );
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${uuidv4()}/documents/${uuidv4()}/reprocess`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("Knowledge base not found");
        });

        it("should return 404 for non-existent document", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/${uuidv4()}/reprocess`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("Document not found");
        });

        it("should return 400 if document belongs to different KB", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const otherKbId = uuidv4();
            const mockDoc = createMockDocument({ knowledge_base_id: otherKbId });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}/reprocess`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("does not belong");
        });

        it("should return 403 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/${uuidv4()}/reprocess`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(403);
        });
    });

    // ========================================================================
    // Delete Document Tests (DELETE /:id/documents/:docId)
    // ========================================================================

    describe("DELETE /knowledge-bases/:id/documents/:docId", () => {
        it("should delete document successfully", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                source_type: "file",
                file_path: "knowledge-bases/test/doc.pdf"
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);
            mockKnowledgeDocumentRepo.delete.mockResolvedValue(true);
            mockGCSStorageService.delete.mockResolvedValue(undefined);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.message).toContain("deleted");
            expect(mockGCSStorageService.delete).toHaveBeenCalledWith(mockDoc.file_path);
            expect(mockKnowledgeDocumentRepo.delete).toHaveBeenCalledWith(mockDoc.id);
        });

        it("should delete URL document without GCS cleanup", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                source_type: "url",
                source_url: "https://example.com/page",
                file_path: null
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);
            mockKnowledgeDocumentRepo.delete.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockGCSStorageService.delete).not.toHaveBeenCalled();
        });

        it("should return 404 for non-existent document", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${mockKb.id}/documents/${uuidv4()}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("Document not found");
        });

        it("should return 400 if document belongs to different KB", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const otherKbId = uuidv4();
            const mockDoc = createMockDocument({ knowledge_base_id: otherKbId });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("does not belong");
        });

        it("should still delete document if GCS deletion fails", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                source_type: "file",
                file_path: "knowledge-bases/test/doc.pdf"
            });

            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);
            mockKnowledgeDocumentRepo.findById.mockResolvedValue(mockDoc);
            mockGCSStorageService.delete.mockRejectedValue(new Error("GCS error"));
            mockKnowledgeDocumentRepo.delete.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${mockKb.id}/documents/${mockDoc.id}`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Should still succeed - GCS deletion is best effort
            expect(response.statusCode).toBe(200);
            expect(mockKnowledgeDocumentRepo.delete).toHaveBeenCalled();
        });
    });
});
