/**
 * Knowledge Base CRUD Operations Tests
 *
 * Tests for Create, List, Get, Update, Delete operations on knowledge bases.
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
    createTestWorkspace,
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

describe("Knowledge Base CRUD Operations", () => {
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
    // Create Knowledge Base Tests (POST /)
    // ========================================================================

    describe("POST /knowledge-bases", () => {
        it("should create a knowledge base successfully", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({
                user_id: user.id,
                workspace_id: workspace.id,
                name: "My Knowledge Base"
            });
            mockKnowledgeBaseRepo.create.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: "/knowledge-bases",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                },
                payload: {
                    name: "My Knowledge Base",
                    description: "A test knowledge base"
                }
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("My Knowledge Base");
            expect(mockKnowledgeBaseRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: user.id,
                    workspace_id: workspace.id,
                    name: "My Knowledge Base"
                })
            );
        });

        it("should create knowledge base with custom config", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({
                user_id: user.id,
                workspace_id: workspace.id,
                config: { chunkSize: 500, chunkOverlap: 100 }
            });
            mockKnowledgeBaseRepo.create.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "POST",
                url: "/knowledge-bases",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                },
                payload: {
                    name: "Custom Config KB",
                    config: { chunkSize: 500, chunkOverlap: 100 }
                }
            });

            expect(response.statusCode).toBe(201);
            expect(mockKnowledgeBaseRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: { chunkSize: 500, chunkOverlap: 100 }
                })
            );
        });

        it("should require authentication", async () => {
            const response = await fastify.inject({
                method: "POST",
                url: "/knowledge-bases",
                payload: { name: "Test KB" }
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // ========================================================================
    // List Knowledge Bases Tests (GET /)
    // ========================================================================

    describe("GET /knowledge-bases", () => {
        it("should list knowledge bases for workspace", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKbs = [
                createMockKnowledgeBase({ workspace_id: workspace.id, name: "KB 1" }),
                createMockKnowledgeBase({ workspace_id: workspace.id, name: "KB 2" })
            ];
            mockKnowledgeBaseRepo.findByWorkspaceId.mockResolvedValue({
                knowledgeBases: mockKbs,
                total: 2
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/knowledge-bases",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(2);
            expect(body.pagination.total).toBe(2);
        });

        it("should support pagination", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findByWorkspaceId.mockResolvedValue({
                knowledgeBases: [createMockKnowledgeBase()],
                total: 100
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/knowledge-bases?limit=10&offset=20",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.pagination.limit).toBe(10);
            expect(body.pagination.offset).toBe(20);
            expect(mockKnowledgeBaseRepo.findByWorkspaceId).toHaveBeenCalledWith(
                workspace.id,
                expect.objectContaining({ limit: 10, offset: 20 })
            );
        });

        it("should filter by folder", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);
            const folderId = uuidv4();

            mockKnowledgeBaseRepo.findByWorkspaceId.mockResolvedValue({
                knowledgeBases: [],
                total: 0
            });

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases?folderId=${folderId}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockKnowledgeBaseRepo.findByWorkspaceId).toHaveBeenCalledWith(
                workspace.id,
                expect.objectContaining({ folderId })
            );
        });

        it("should filter by root level (folderId=null)", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findByWorkspaceId.mockResolvedValue({
                knowledgeBases: [],
                total: 0
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/knowledge-bases?folderId=null",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockKnowledgeBaseRepo.findByWorkspaceId).toHaveBeenCalledWith(
                workspace.id,
                expect.objectContaining({ folderId: null })
            );
        });

        it("should require authentication", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/knowledge-bases"
            });

            expect(response.statusCode).toBe(401);
        });
    });

    // ========================================================================
    // Get Knowledge Base Tests (GET /:id)
    // ========================================================================

    describe("GET /knowledge-bases/:id", () => {
        it("should return knowledge base by ID", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({
                user_id: user.id,
                workspace_id: workspace.id
            });
            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(mockKb);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${mockKb.id}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.id).toBe(mockKb.id);
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "GET",
                url: `/knowledge-bases/${uuidv4()}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(false);
            expect(body.error).toContain("not found");
        });
    });

    // ========================================================================
    // Update Knowledge Base Tests (PUT /:id)
    // ========================================================================

    describe("PUT /knowledge-bases/:id", () => {
        it("should update knowledge base successfully", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({
                user_id: user.id,
                workspace_id: workspace.id
            });
            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(mockKb);

            const updatedKb = { ...mockKb, name: "Updated Name" };
            mockKnowledgeBaseRepo.update.mockResolvedValue(updatedKb);

            const response = await fastify.inject({
                method: "PUT",
                url: `/knowledge-bases/${mockKb.id}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                },
                payload: {
                    name: "Updated Name",
                    description: "Updated description"
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("Updated Name");
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "PUT",
                url: `/knowledge-bases/${uuidv4()}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                },
                payload: { name: "New Name" }
            });

            expect(response.statusCode).toBe(404);
        });

        it("should update config", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({
                user_id: user.id,
                workspace_id: workspace.id
            });
            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(mockKb);
            mockKnowledgeBaseRepo.update.mockResolvedValue({
                ...mockKb,
                config: { ...mockKb.config, chunkSize: 2000 }
            });

            const response = await fastify.inject({
                method: "PUT",
                url: `/knowledge-bases/${mockKb.id}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                },
                payload: {
                    config: { chunkSize: 2000 }
                }
            });

            expect(response.statusCode).toBe(200);
            expect(mockKnowledgeBaseRepo.update).toHaveBeenCalledWith(
                mockKb.id,
                expect.objectContaining({
                    config: { chunkSize: 2000 }
                })
            );
        });
    });

    // ========================================================================
    // Delete Knowledge Base Tests (DELETE /:id)
    // ========================================================================

    describe("DELETE /knowledge-bases/:id", () => {
        it("should delete knowledge base successfully", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            const mockKb = createMockKnowledgeBase({
                user_id: user.id,
                workspace_id: workspace.id
            });
            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(mockKb);
            mockKnowledgeBaseRepo.delete.mockResolvedValue(true);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${mockKb.id}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.success).toBe(true);
            expect(body.message).toContain("deleted");
            expect(mockKnowledgeBaseRepo.delete).toHaveBeenCalledWith(mockKb.id);
        });

        it("should return 404 for non-existent knowledge base", async () => {
            const user = createTestUser();
            const workspace = createTestWorkspace(user.id);
            const token = createAuthToken(fastify, user);

            mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await fastify.inject({
                method: "DELETE",
                url: `/knowledge-bases/${uuidv4()}`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-Workspace-Id": workspace.id
                }
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
