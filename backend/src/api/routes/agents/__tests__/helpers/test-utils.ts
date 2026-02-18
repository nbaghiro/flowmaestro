/**
 * Agent Routes Test Utilities
 *
 * Shared mock definitions and helper functions for agent route tests.
 */

import { v4 as uuidv4 } from "uuid";
import { DEFAULT_TEST_WORKSPACE_ID } from "../../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// MOCK REPOSITORY DEFINITIONS
// ============================================================================

// Mock agent repository
export const mockAgentRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

// Mock agent execution repository
export const mockAgentExecutionRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByAgentId: jest.fn(),
    getMessagesByThread: jest.fn(),
    update: jest.fn()
};

// Mock thread repository
export const mockThreadRepo = {
    create: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

// Mock Temporal handle and client
export const mockTemporalHandle = {
    signal: jest.fn().mockResolvedValue(undefined)
};

export const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MockTool {
    id: string;
    name: string;
    type: string;
    description: string;
    schema: object;
    config: object;
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

export function createMockAgent(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        description: string;
        model: string;
        provider: string;
        system_prompt: string;
        temperature: number;
        max_tokens: number;
        max_iterations: number;
        available_tools: MockTool[];
        memory_config: object;
        connection_id: string | null;
        folder_id: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Agent",
        description: overrides.description || "A test agent",
        model: overrides.model || "gpt-4",
        provider: overrides.provider || "openai",
        system_prompt: overrides.system_prompt || "You are a helpful assistant.",
        temperature: overrides.temperature ?? 0.7,
        max_tokens: overrides.max_tokens ?? 4096,
        max_iterations: overrides.max_iterations ?? 100,
        available_tools: overrides.available_tools || [],
        memory_config: overrides.memory_config || { type: "buffer", max_messages: 50 },
        connection_id: overrides.connection_id ?? null,
        folder_id: overrides.folder_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

export function createMockAgentExecution(
    overrides: Partial<{
        id: string;
        agent_id: string;
        user_id: string;
        thread_id: string;
        workspace_id: string;
        status: string;
        iterations: number;
        tool_calls_count: number;
        thread_history: object[];
        error: string | null;
        started_at: Date;
        completed_at: Date | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        agent_id: overrides.agent_id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        thread_id: overrides.thread_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        status: overrides.status || "running",
        iterations: overrides.iterations ?? 0,
        tool_calls_count: overrides.tool_calls_count ?? 0,
        thread_history: overrides.thread_history || [],
        error: overrides.error ?? null,
        started_at: overrides.started_at || new Date(),
        completed_at: overrides.completed_at ?? null,
        created_at: new Date(),
        updated_at: new Date()
    };
}

export function createMockThread(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        agent_id: string;
        title: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        agent_id: overrides.agent_id || uuidv4(),
        title: overrides.title ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

// ============================================================================
// MOCK RESET FUNCTION
// ============================================================================

export function resetAllMocks() {
    jest.clearAllMocks();

    // Reset agent repository behaviors
    mockAgentRepo.findByWorkspaceId.mockResolvedValue([]);
    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockAgentRepo.findById.mockResolvedValue(null);
    mockAgentRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockAgent({ ...data, id: uuidv4() }))
    );
    mockAgentRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockAgent({ id, ...data }))
    );
    mockAgentRepo.delete.mockResolvedValue(true);

    // Reset agent execution repository behaviors
    mockAgentExecutionRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockAgentExecution({ ...data, id: uuidv4() }))
    );
    mockAgentExecutionRepo.findById.mockResolvedValue(null);
    mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockAgentExecutionRepo.findByAgentId.mockResolvedValue({ executions: [], total: 0 });
    mockAgentExecutionRepo.getMessagesByThread.mockResolvedValue([]);
    mockAgentExecutionRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockAgentExecution({ id, ...data }))
    );

    // Reset thread repository behaviors
    mockThreadRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockThread({ ...data, id: uuidv4() }))
    );
    mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    // Reset Temporal mocks
    mockTemporalHandle.signal.mockResolvedValue(undefined);
    mockTemporalClient.workflow.start.mockResolvedValue(mockTemporalHandle);
}
