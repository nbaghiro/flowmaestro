/**
 * Shared test utilities for agent memory route tests.
 * Provides mock repositories, services, helper functions, and type definitions.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    authenticatedRequest as baseAuthenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser as baseCreateTestUser,
    expectErrorResponse as baseExpectErrorResponse,
    expectStatus as baseExpectStatus,
    expectSuccessResponse as baseExpectSuccessResponse,
    unauthenticatedRequest as baseUnauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TYPES
// ============================================================================

export interface TestUser {
    id: string;
    email: string;
    name: string;
}

export interface WorkingMemory {
    id: string;
    agentId: string;
    userId: string;
    threadId: string | null;
    workingMemory: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Agent {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    memory_config: {
        max_messages: number;
        embeddings_enabled?: boolean;
        working_memory_enabled?: boolean;
    };
}

export interface SearchResult {
    content: string;
    message_role: string;
    similarity: number;
    execution_id: string;
    context_before: string[];
    context_after: string[];
}

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

export const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

export const mockWorkingMemoryRepo = {
    listByAgent: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByAgent: jest.fn()
};

export const mockThreadEmbeddingRepo = {
    searchSimilar: jest.fn(),
    getCountForAgent: jest.fn(),
    deleteByAgent: jest.fn()
};

export const mockEmbeddingService = {
    generateEmbeddings: jest.fn()
};

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

export { DEFAULT_TEST_WORKSPACE_ID };
export { uuidv4 };

export function createMockAgent(overrides: Partial<Agent> = {}): Agent {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Agent",
        memory_config: overrides.memory_config || { max_messages: 50 }
    };
}

export function createMockWorkingMemory(overrides: Partial<WorkingMemory> = {}): WorkingMemory {
    return {
        id: overrides.id || uuidv4(),
        agentId: overrides.agentId || uuidv4(),
        userId: overrides.userId || uuidv4(),
        threadId: overrides.threadId ?? null,
        workingMemory: overrides.workingMemory || "Test working memory content",
        metadata: overrides.metadata ?? null,
        createdAt: overrides.createdAt || new Date(),
        updatedAt: overrides.updatedAt || new Date()
    };
}

export function createMockSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
    return {
        content: overrides.content || "Test search result content",
        message_role: overrides.message_role || "user",
        similarity: overrides.similarity ?? 0.85,
        execution_id: overrides.execution_id || uuidv4(),
        context_before: overrides.context_before || [],
        context_after: overrides.context_after || []
    };
}

// ============================================================================
// RESET HELPERS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset agent repository defaults
    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    // Reset working memory repository defaults
    mockWorkingMemoryRepo.listByAgent.mockResolvedValue([]);
    mockWorkingMemoryRepo.get.mockResolvedValue(null);
    mockWorkingMemoryRepo.update.mockImplementation(
        (data: { agentId: string; userId: string; workingMemory: string }) =>
            Promise.resolve(
                createMockWorkingMemory({
                    agentId: data.agentId,
                    userId: data.userId,
                    workingMemory: data.workingMemory
                })
            )
    );
    mockWorkingMemoryRepo.delete.mockResolvedValue(false);
    mockWorkingMemoryRepo.deleteByAgent.mockResolvedValue(0);

    // Reset embedding repository defaults
    mockThreadEmbeddingRepo.searchSimilar.mockResolvedValue([]);
    mockThreadEmbeddingRepo.getCountForAgent.mockResolvedValue(0);
    mockThreadEmbeddingRepo.deleteByAgent.mockResolvedValue(0);

    // Reset embedding service defaults
    mockEmbeddingService.generateEmbeddings.mockResolvedValue({
        embeddings: [[0.1, 0.2, 0.3]],
        tokens_used: 10
    });
}

// ============================================================================
// SERVER HELPERS
// ============================================================================

export async function createMemoryTestServer(): Promise<FastifyInstance> {
    return createTestServer();
}

export async function closeMemoryTestServer(fastify: FastifyInstance): Promise<void> {
    return closeTestServer(fastify);
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

export const createTestUser = baseCreateTestUser;
export const authenticatedRequest = baseAuthenticatedRequest;
export const unauthenticatedRequest = baseUnauthenticatedRequest;
export const expectStatus = baseExpectStatus;
export const expectSuccessResponse = baseExpectSuccessResponse;
export const expectErrorResponse = baseExpectErrorResponse;
