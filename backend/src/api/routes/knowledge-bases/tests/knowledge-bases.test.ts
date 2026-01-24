/**
 * Knowledge Base Routes Integration Tests
 *
 * Tests for knowledge base endpoints including:
 * - CRUD operations (create, list, get, update, delete)
 * - Statistics retrieval
 * - Semantic query
 * - Document management (list, delete)
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP - Must be before imports that use these modules
// ============================================================================

// Mock KnowledgeBaseRepository
const mockKnowledgeBaseRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkspaceId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn()
};

// Mock KnowledgeDocumentRepository
const mockKnowledgeDocumentRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByKnowledgeBaseId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
    deleteByKnowledgeBaseId: jest.fn()
};

// Mock KnowledgeChunkRepository
const mockKnowledgeChunkRepo = {
    create: jest.fn(),
    batchInsert: jest.fn(),
    findById: jest.fn(),
    findByDocumentId: jest.fn(),
    searchSimilar: jest.fn(),
    deleteByDocumentId: jest.fn(),
    deleteByKnowledgeBaseId: jest.fn(),
    countByKnowledgeBaseId: jest.fn()
};

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

// Mock EmbeddingService
const mockEmbeddingService = {
    generateQueryEmbedding: jest.fn()
};

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
}));

// Mock GCSStorageService
const mockGCSStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    getSignedUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
    getMetadata: jest.fn()
};

jest.mock("../../../../services/GCSStorageService", () => ({
    getGCSStorageService: jest.fn().mockReturnValue(mockGCSStorageService),
    GCSStorageService: jest.fn().mockImplementation(() => mockGCSStorageService)
}));

// Mock Temporal client
jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockReturnValue({
        workflow: {
            start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
        }
    })
}));

// Mock workspace repositories
const mockWorkspaceRepo = {
    findById: jest.fn()
};

const mockWorkspaceMemberRepo = {
    findByWorkspaceAndUser: jest.fn()
};

jest.mock("../../../../storage/repositories/WorkspaceRepository", () => ({
    WorkspaceRepository: jest.fn().mockImplementation(() => mockWorkspaceRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceMemberRepository", () => ({
    WorkspaceMemberRepository: jest.fn().mockImplementation(() => mockWorkspaceMemberRepo)
}));

// Mock RedisEventBus before config is used
const mockRedisEventBus = {
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    createSSEStream: jest.fn().mockReturnValue({
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
    })
};

jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: mockRedisEventBus,
    RedisEventBus: {
        getInstance: jest.fn().mockReturnValue(mockRedisEventBus)
    }
}));

// Mock SSE handler
const mockSSEHandler = {
    sendEvent: jest.fn(),
    onDisconnect: jest.fn()
};

jest.mock("../../../../services/sse", () => ({
    createSSEHandler: jest.fn().mockReturnValue(mockSSEHandler)
}));

// Mock config
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

// Mock database
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
// TEST HELPERS
// ============================================================================

interface TestUser {
    id: string;
    email: string;
    name?: string;
}

interface TestWorkspace {
    id: string;
    name: string;
    owner_id: string;
}

function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || `test-${Date.now()}@example.com`,
        name: overrides.name || "Test User"
    };
}

function createTestWorkspace(
    ownerId: string,
    overrides: Partial<TestWorkspace> = {}
): TestWorkspace {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "Test Workspace",
        owner_id: ownerId
    };
}

function createMockKnowledgeBase(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        description: string | null;
        config: Record<string, unknown>;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || uuidv4(),
        name: overrides.name || "Test Knowledge Base",
        description:
            overrides.description !== undefined ? overrides.description : "Test description",
        config: overrides.config || {
            embeddingModel: "text-embedding-3-small",
            embeddingProvider: "openai",
            chunkSize: 1000,
            chunkOverlap: 200,
            embeddingDimensions: 1536
        },
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockDocument(
    overrides: Partial<{
        id: string;
        knowledge_base_id: string;
        name: string;
        source_type: string;
        source_url: string | null;
        file_path: string | null;
        file_type: string;
        file_size: bigint | null;
        status: string;
        error_message: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        knowledge_base_id: overrides.knowledge_base_id || uuidv4(),
        name: overrides.name || "test-document.pdf",
        source_type: overrides.source_type || "file",
        source_url: overrides.source_url !== undefined ? overrides.source_url : null,
        file_path:
            overrides.file_path !== undefined
                ? overrides.file_path
                : "knowledge-bases/test/test.pdf",
        file_type: overrides.file_type || "pdf",
        file_size: overrides.file_size !== undefined ? overrides.file_size : BigInt(1024),
        content: null,
        metadata: {},
        status: overrides.status || "ready",
        error_message: overrides.error_message !== undefined ? overrides.error_message : null,
        processing_started_at: new Date(),
        processing_completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockWorkspaceMember(workspaceId: string, userId: string) {
    return {
        id: uuidv4(),
        workspace_id: workspaceId,
        user_id: userId,
        role: "owner",
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createAuthToken(fastify: FastifyInstance, user: TestUser): string {
    return fastify.jwt.sign({
        id: user.id,
        email: user.email
    });
}

// ============================================================================
// TEST SERVER SETUP
// ============================================================================

async function createKnowledgeBaseTestServer(): Promise<FastifyInstance> {
    const Fastify = (await import("fastify")).default;
    const jwt = (await import("@fastify/jwt")).default;
    const cors = (await import("@fastify/cors")).default;
    const multipart = (await import("@fastify/multipart")).default;

    const fastify = Fastify({ logger: false });

    await fastify.register(cors, {
        origin: true,
        credentials: true
    });

    await fastify.register(jwt, {
        secret: "test-jwt-secret",
        sign: { expiresIn: "1h" }
    });

    await fastify.register(multipart, {
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB
        }
    });

    // Register knowledge base routes
    const { knowledgeBaseRoutes } = await import("../index");
    await fastify.register(knowledgeBaseRoutes, { prefix: "/knowledge-bases" });

    return fastify;
}

// ============================================================================
// TESTS
// ============================================================================

describe("Knowledge Base Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createKnowledgeBaseTestServer();
        await fastify.ready();
    });

    afterAll(async () => {
        await fastify.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default workspace mocks
        mockWorkspaceRepo.findById.mockImplementation((id: string) =>
            Promise.resolve({
                id,
                name: "Test Workspace",
                slug: "test-workspace",
                type: "personal",
                owner_id: "test-user-id",
                created_at: new Date(),
                updated_at: new Date()
            })
        );
        mockWorkspaceMemberRepo.findByWorkspaceAndUser.mockImplementation(
            (workspaceId: string, userId: string) =>
                Promise.resolve(createMockWorkspaceMember(workspaceId, userId))
        );
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

    // ========================================================================
    // Authentication Tests
    // ========================================================================

    describe("Authentication", () => {
        const endpoints = [
            { method: "GET" as const, url: "/knowledge-bases" },
            { method: "POST" as const, url: "/knowledge-bases" },
            { method: "GET" as const, url: `/knowledge-bases/${uuidv4()}` },
            { method: "PUT" as const, url: `/knowledge-bases/${uuidv4()}` },
            { method: "DELETE" as const, url: `/knowledge-bases/${uuidv4()}` },
            { method: "GET" as const, url: `/knowledge-bases/${uuidv4()}/stats` },
            { method: "POST" as const, url: `/knowledge-bases/${uuidv4()}/query` },
            { method: "GET" as const, url: `/knowledge-bases/${uuidv4()}/documents` },
            {
                method: "DELETE" as const,
                url: `/knowledge-bases/${uuidv4()}/documents/${uuidv4()}`
            },
            { method: "POST" as const, url: `/knowledge-bases/${uuidv4()}/documents/url` },
            {
                method: "GET" as const,
                url: `/knowledge-bases/${uuidv4()}/documents/${uuidv4()}/download`
            },
            {
                method: "POST" as const,
                url: `/knowledge-bases/${uuidv4()}/documents/${uuidv4()}/reprocess`
            },
            { method: "GET" as const, url: `/knowledge-bases/${uuidv4()}/stream` }
        ];

        endpoints.forEach(({ method, url }) => {
            it(`${method} ${url} should require authentication`, async () => {
                const response = await fastify.inject({
                    method,
                    url,
                    payload: method === "POST" || method === "PUT" ? { name: "test" } : undefined
                });

                expect(response.statusCode).toBe(401);
            });
        });
    });
});
