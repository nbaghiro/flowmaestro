/**
 * Execution Routes Test Utilities
 *
 * Shared mocks and helper functions for execution tests.
 */

import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCKS
// ============================================================================

export const mockExecutionRepo = {
    findAll: jest.fn(),
    findByWorkflowId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    getLogs: jest.fn()
};

export const mockWorkflowRepo = {
    findById: jest.fn()
};

export const mockTemporalHandle = {
    cancel: jest.fn().mockResolvedValue(undefined),
    signal: jest.fn().mockResolvedValue(undefined)
};

export const mockTemporalClient = {
    workflow: {
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

// ============================================================================
// TEST HELPERS
// ============================================================================

export function createMockExecution(
    overrides: Partial<{
        id: string;
        workflow_id: string;
        status: string;
        started_at: Date;
        completed_at: Date | null;
        outputs: object;
        node_outputs: object;
        pause_context: object | null;
        current_state: object | null;
        error: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        workflow_id: overrides.workflow_id || uuidv4(),
        status: overrides.status || "running",
        started_at: overrides.started_at || new Date(),
        completed_at: overrides.completed_at ?? null,
        outputs: overrides.outputs || {},
        node_outputs: overrides.node_outputs || {},
        pause_context: overrides.pause_context ?? null,
        current_state: overrides.current_state ?? null,
        error: overrides.error ?? null,
        created_at: new Date(),
        updated_at: new Date()
    };
}

export function createMockWorkflow(
    overrides: Partial<{
        id: string;
        user_id: string;
        name: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        name: overrides.name || "Test Workflow",
        definition: { nodes: {}, edges: [] },
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

export function createMockLog(
    overrides: Partial<{
        id: string;
        execution_id: string;
        level: string;
        message: string;
        node_id: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        execution_id: overrides.execution_id || uuidv4(),
        level: overrides.level || "info",
        message: overrides.message || "Test log message",
        node_id: overrides.node_id ?? null,
        timestamp: new Date(),
        metadata: {}
    };
}

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset default behaviors
    mockExecutionRepo.findAll.mockResolvedValue({ executions: [], total: 0 });
    mockExecutionRepo.findByWorkflowId.mockResolvedValue({ executions: [], total: 0 });
    mockExecutionRepo.findById.mockResolvedValue(null);
    mockExecutionRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockExecution({ id, ...data }))
    );
    mockExecutionRepo.getLogs.mockResolvedValue({ logs: [], total: 0 });
    mockWorkflowRepo.findById.mockResolvedValue(null);

    // Reset Temporal mocks
    mockTemporalHandle.cancel.mockResolvedValue(undefined);
    mockTemporalHandle.signal.mockResolvedValue(undefined);
}
