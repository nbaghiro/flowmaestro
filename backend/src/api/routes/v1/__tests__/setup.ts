/**
 * Shared test setup for v1 API route tests
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest as baseApiKeyRequest,
    setupMockApiKey,
    createTestApiKey,
    mockApiKeyRepo,
    TEST_API_KEY_USER_ID,
    TEST_API_KEY_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// Re-export test helpers
export {
    createTestServer,
    closeTestServer,
    setupMockApiKey,
    createTestApiKey,
    mockApiKeyRepo,
    TEST_API_KEY_USER_ID,
    TEST_API_KEY_WORKSPACE_ID
};

// Type helper for API responses
export interface V1ApiResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>;
    error: { code: string; message: string };
    meta: { request_id: string; timestamp: string };
    pagination: {
        total: number;
        total_count: number;
        total_pages: number;
        page: number;
        per_page: number;
        pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export function parseResponse(response: { json: () => unknown }): V1ApiResponse {
    return response.json() as V1ApiResponse;
}

// Re-export apiKeyRequest
export const apiKeyRequest = baseApiKeyRequest;

// Mock repositories used by v1 routes
export const mockWorkflowRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

export const mockExecutionRepo = {
    findById: jest.fn(),
    findByWorkflowId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

export const mockAgentRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

export const mockThreadRepo = {
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

export const mockAgentExecutionRepo = {
    findById: jest.fn(),
    getMessagesByThread: jest.fn(),
    getMessages: jest.fn(),
    create: jest.fn()
};

export const mockTriggerRepo = {
    findById: jest.fn(),
    findByWorkflowId: jest.fn(),
    createExecution: jest.fn(),
    recordTrigger: jest.fn()
};

export const mockKnowledgeBaseRepo = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    getStats: jest.fn()
};

export const mockKnowledgeChunkRepo = {
    searchSimilar: jest.fn()
};

export const mockWorkingMemoryRepo = {
    get: jest.fn(),
    listByAgent: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

export const mockThreadEmbeddingRepo = {
    searchSimilar: jest.fn(),
    getCountForAgent: jest.fn()
};

export const mockOutgoingWebhookRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    create: jest.fn(),
    updateByWorkspace: jest.fn(),
    deleteByWorkspace: jest.fn()
};

export const mockWebhookDeliveryRepo = {
    findByWebhookId: jest.fn()
};

export const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" }),
        getHandle: jest.fn().mockReturnValue({
            cancel: jest.fn().mockResolvedValue(undefined)
        })
    }
};

export const mockEmbeddingService = {
    generateEmbeddings: jest.fn()
};

/**
 * Setup common repository mocks
 */
export function setupRepositoryMocks(): void {
    jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
        WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
    }));

    jest.mock("../../../../storage/repositories/ExecutionRepository", () => ({
        ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
    }));

    jest.mock("../../../../storage/repositories/AgentRepository", () => ({
        AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
    }));

    jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
        ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
    }));

    jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
        AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
    }));

    jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
        TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
    }));

    jest.mock("../../../../storage/repositories/KnowledgeBaseRepository", () => ({
        KnowledgeBaseRepository: jest.fn().mockImplementation(() => mockKnowledgeBaseRepo)
    }));

    jest.mock("../../../../storage/repositories/KnowledgeChunkRepository", () => ({
        KnowledgeChunkRepository: jest.fn().mockImplementation(() => mockKnowledgeChunkRepo)
    }));

    jest.mock("../../../../storage/repositories/WorkingMemoryRepository", () => ({
        WorkingMemoryRepository: jest.fn().mockImplementation(() => mockWorkingMemoryRepo)
    }));

    jest.mock("../../../../storage/repositories/ThreadEmbeddingRepository", () => ({
        ThreadEmbeddingRepository: jest.fn().mockImplementation(() => mockThreadEmbeddingRepo)
    }));

    jest.mock("../../../../storage/repositories/OutgoingWebhookRepository", () => ({
        OutgoingWebhookRepository: jest.fn().mockImplementation(() => mockOutgoingWebhookRepo),
        WebhookDeliveryRepository: jest.fn().mockImplementation(() => mockWebhookDeliveryRepo)
    }));

    jest.mock("../../../../temporal/client", () => ({
        getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient)
    }));

    jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
        EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
    }));

    jest.mock("../../../../services/sse", () => ({
        createSSEHandler: jest.fn().mockReturnValue({
            sendEvent: jest.fn(),
            onDisconnect: jest.fn()
        }),
        sendTerminalEvent: jest.fn()
    }));

    jest.mock("../../../../services/events/RedisEventBus", () => ({
        redisEventBus: {
            subscribe: jest.fn().mockResolvedValue(undefined),
            unsubscribe: jest.fn().mockResolvedValue(undefined)
        }
    }));

    jest.mock("../../../../storage/models/OutgoingWebhook", () => ({
        WEBHOOK_EVENT_TYPES: [
            "workflow.started",
            "workflow.completed",
            "workflow.failed",
            "execution.started",
            "execution.completed",
            "execution.failed"
        ]
    }));

    jest.mock("@flowmaestro/shared", () => ({
        ...jest.requireActual("@flowmaestro/shared"),
        validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
        convertFrontendToBackend: jest.fn().mockImplementation((def, name) => ({ ...def, name })),
        stripNonExecutableNodes: jest.fn().mockImplementation((def) => def)
    }));
}

/**
 * Common test server setup
 */
export async function createV1TestServer(): Promise<FastifyInstance> {
    return createTestServer();
}
