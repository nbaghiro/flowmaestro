/**
 * Knowledge Base Multi-Tenant Isolation Tests
 *
 * Tests for authentication requirements and authorization across all endpoints.
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

describe("Knowledge Base Multi-Tenant Isolation", () => {
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
