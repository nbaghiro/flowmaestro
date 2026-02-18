/**
 * Knowledge Base Test Utilities
 *
 * Shared mocks, helpers, and test utilities for knowledge base route tests.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK REPOSITORY DEFINITIONS
// ============================================================================

// Mock KnowledgeBaseRepository
export const mockKnowledgeBaseRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkspaceId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn()
};

// Mock KnowledgeDocumentRepository
export const mockKnowledgeDocumentRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByKnowledgeBaseId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
    deleteByKnowledgeBaseId: jest.fn()
};

// Mock KnowledgeChunkRepository
export const mockKnowledgeChunkRepo = {
    create: jest.fn(),
    batchInsert: jest.fn(),
    findById: jest.fn(),
    findByDocumentId: jest.fn(),
    searchSimilar: jest.fn(),
    deleteByDocumentId: jest.fn(),
    deleteByKnowledgeBaseId: jest.fn(),
    countByKnowledgeBaseId: jest.fn()
};

// Mock EmbeddingService
export const mockEmbeddingService = {
    generateQueryEmbedding: jest.fn()
};

// Mock GCSStorageService
export const mockGCSStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    getSignedUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
    getMetadata: jest.fn()
};

// Mock workspace repositories
export const mockWorkspaceRepo = {
    findById: jest.fn()
};

export const mockWorkspaceMemberRepo = {
    findByWorkspaceAndUser: jest.fn()
};

// Mock RedisEventBus
export const mockRedisEventBus = {
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    createSSEStream: jest.fn().mockReturnValue({
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
    })
};

// Mock SSE handler
export const mockSSEHandler = {
    sendEvent: jest.fn(),
    onDisconnect: jest.fn()
};

// ============================================================================
// RESET ALL MOCKS
// ============================================================================

export function resetAllMocks(): void {
    // Reset KnowledgeBaseRepository mocks
    mockKnowledgeBaseRepo.create.mockReset();
    mockKnowledgeBaseRepo.findById.mockReset();
    mockKnowledgeBaseRepo.findByIdAndWorkspaceId.mockReset();
    mockKnowledgeBaseRepo.findByWorkspaceId.mockReset();
    mockKnowledgeBaseRepo.update.mockReset();
    mockKnowledgeBaseRepo.delete.mockReset();
    mockKnowledgeBaseRepo.getStats.mockReset();

    // Reset KnowledgeDocumentRepository mocks
    mockKnowledgeDocumentRepo.create.mockReset();
    mockKnowledgeDocumentRepo.findById.mockReset();
    mockKnowledgeDocumentRepo.findByKnowledgeBaseId.mockReset();
    mockKnowledgeDocumentRepo.update.mockReset();
    mockKnowledgeDocumentRepo.delete.mockReset();
    mockKnowledgeDocumentRepo.updateStatus.mockReset();
    mockKnowledgeDocumentRepo.deleteByKnowledgeBaseId.mockReset();

    // Reset KnowledgeChunkRepository mocks
    mockKnowledgeChunkRepo.create.mockReset();
    mockKnowledgeChunkRepo.batchInsert.mockReset();
    mockKnowledgeChunkRepo.findById.mockReset();
    mockKnowledgeChunkRepo.findByDocumentId.mockReset();
    mockKnowledgeChunkRepo.searchSimilar.mockReset();
    mockKnowledgeChunkRepo.deleteByDocumentId.mockReset();
    mockKnowledgeChunkRepo.deleteByKnowledgeBaseId.mockReset();
    mockKnowledgeChunkRepo.countByKnowledgeBaseId.mockReset();

    // Reset EmbeddingService mocks
    mockEmbeddingService.generateQueryEmbedding.mockReset();

    // Reset GCSStorageService mocks
    mockGCSStorageService.upload.mockReset();
    mockGCSStorageService.download.mockReset();
    mockGCSStorageService.delete.mockReset();
    mockGCSStorageService.getSignedUrl.mockReset();
    mockGCSStorageService.getSignedDownloadUrl.mockReset();
    mockGCSStorageService.getMetadata.mockReset();

    // Reset workspace mocks
    mockWorkspaceRepo.findById.mockReset();
    mockWorkspaceMemberRepo.findByWorkspaceAndUser.mockReset();

    // Reset RedisEventBus mocks
    mockRedisEventBus.publish.mockReset();
    mockRedisEventBus.subscribe.mockReset();
    mockRedisEventBus.unsubscribe.mockReset();
    mockRedisEventBus.createSSEStream.mockReset();
    mockRedisEventBus.createSSEStream.mockReturnValue({
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
    });

    // Reset SSE handler mocks
    mockSSEHandler.sendEvent.mockReset();
    mockSSEHandler.onDisconnect.mockReset();
}

// ============================================================================
// TEST DATA INTERFACES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    name?: string;
}

export interface TestWorkspace {
    id: string;
    name: string;
    owner_id: string;
}

// ============================================================================
// MOCK DATA CREATORS
// ============================================================================

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
        id: overrides.id || uuidv4(),
        email: overrides.email || `test-${Date.now()}@example.com`,
        name: overrides.name || "Test User"
    };
}

export function createTestWorkspace(
    ownerId: string,
    overrides: Partial<TestWorkspace> = {}
): TestWorkspace {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "Test Workspace",
        owner_id: ownerId
    };
}

export function createMockKnowledgeBase(
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

export function createMockDocument(
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

export function createMockWorkspaceMember(workspaceId: string, userId: string) {
    return {
        id: uuidv4(),
        workspace_id: workspaceId,
        user_id: userId,
        role: "owner",
        created_at: new Date(),
        updated_at: new Date()
    };
}

export function createAuthToken(fastify: FastifyInstance, user: TestUser): string {
    return fastify.jwt.sign({
        id: user.id,
        email: user.email
    });
}

// ============================================================================
// TEST SERVER SETUP
// ============================================================================

export async function createKnowledgeBaseTestServer(): Promise<FastifyInstance> {
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
    const { knowledgeBaseRoutes } = await import("../../index");
    await fastify.register(knowledgeBaseRoutes, { prefix: "/knowledge-bases" });

    return fastify;
}

// ============================================================================
// DEFAULT WORKSPACE MOCK SETUP
// ============================================================================

export function setupDefaultWorkspaceMocks(): void {
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
}
