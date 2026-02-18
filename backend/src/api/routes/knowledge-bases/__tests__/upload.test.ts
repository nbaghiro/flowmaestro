/**
 * Knowledge Base Upload Operations Tests
 *
 * Tests for Upload file and Add URL document operations.
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

describe("Knowledge Base Upload Operations", () => {
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
    // Upload Document Tests (POST /:id/documents/upload)
    // ========================================================================

    describe("POST /knowledge-bases/:id/documents/upload", () => {
        it("should upload a file document successfully", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                name: "test-document.pdf",
                source_type: "file",
                file_type: "pdf",
                status: "pending"
            });
            mockKnowledgeDocumentRepo.create.mockResolvedValue(mockDoc);
            mockGCSStorageService.upload.mockResolvedValue(
                `knowledge-bases/${mockKb.id}/${mockDoc.id}/test-document.pdf`
            );
            mockGCSStorageService.getMetadata.mockResolvedValue({ size: 1024 });

            // Create a simple multipart form
            const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
            const fileContent = Buffer.from("test file content");
            const body = Buffer.concat([
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-document.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
                ),
                fileContent,
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/upload`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`
                },
                payload: body
            });

            expect(response.statusCode).toBe(201);
            const responseBody = JSON.parse(response.payload);
            expect(responseBody.success).toBe(true);
            expect(responseBody.data.document.name).toBe("test-document.pdf");
        });

        it("should reject unsupported file types", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
            const body = Buffer.concat([
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.exe"\r\nContent-Type: application/octet-stream\r\n\r\n`
                ),
                Buffer.from("binary content"),
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/upload`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`
                },
                payload: body
            });

            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.payload);
            expect(responseBody.error).toContain("Unsupported file type");
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
            const body = Buffer.concat([
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
                ),
                Buffer.from("content"),
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${uuidv4()}/documents/upload`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`
                },
                payload: body
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 403 for non-owner", async () => {
            const user = createTestUser();
            const otherUserId = uuidv4();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: otherUserId });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
            const body = Buffer.concat([
                Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
                ),
                Buffer.from("content"),
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/upload`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": `multipart/form-data; boundary=${boundary}`
                },
                payload: body
            });

            expect(response.statusCode).toBe(403);
        });
    });

    // ========================================================================
    // Add URL Document Tests (POST /:id/documents/url)
    // ========================================================================

    describe("POST /knowledge-bases/:id/documents/url", () => {
        it("should add a URL document successfully", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const mockDoc = createMockDocument({
                knowledge_base_id: mockKb.id,
                name: "Example Article",
                source_type: "url",
                source_url: "https://example.com/article",
                file_path: null,
                file_type: "html",
                status: "pending"
            });
            mockKnowledgeDocumentRepo.create.mockResolvedValue(mockDoc);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/url`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    url: "https://example.com/article",
                    name: "Example Article"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.document.source_type).toBe("url");
            expect(mockKnowledgeDocumentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    source_url: "https://example.com/article",
                    source_type: "url"
                })
            );
        });

        it("should reject invalid URL format", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/url`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    url: "not-a-valid-url"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("Invalid URL");
        });

        it("should reject non-http/https protocols", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({ user_id: user.id });
            mockKnowledgeBaseRepo.findById.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/url`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    url: "ftp://example.com/file.txt"
                }
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain("http or https");
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "POST",
                url: `/knowledge-bases/${uuidv4()}/documents/url`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    url: "https://example.com/article"
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
                method: "POST",
                url: `/knowledge-bases/${mockKb.id}/documents/url`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                payload: {
                    url: "https://example.com/article"
                }
            });

            expect(response.statusCode).toBe(403);
        });
    });
});
