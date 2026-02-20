/**
 * Shared test utilities for trigger route tests.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    createTestServer,
    closeTestServer,
    createTestUser as baseCreateTestUser,
    authenticatedRequest as baseAuthenticatedRequest,
    unauthenticatedRequest as baseUnauthenticatedRequest,
    expectStatus as baseExpectStatus,
    expectSuccessResponse as baseExpectSuccessResponse,
    expectErrorResponse as baseExpectErrorResponse,
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

export interface MockTrigger {
    id: string;
    workflow_id: string;
    workspace_id: string;
    name: string;
    trigger_type: string;
    config: object;
    enabled: boolean;
    temporal_schedule_id: string | null;
    last_triggered_at: Date | null;
    trigger_count: number;
    created_at: Date;
    updated_at: Date;
}

export interface MockWorkflow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    definition: object;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

export const mockTriggerRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkflowId: jest.fn(),
    findByType: jest.fn(),
    findScheduledTriggersToProcess: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createExecution: jest.fn(),
    recordTrigger: jest.fn()
};

export const mockWorkflowRepo = {
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

export const mockExecutionRepo = {
    create: jest.fn()
};

export const mockSchedulerService = {
    createScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    updateSchedule: jest.fn().mockResolvedValue(undefined),
    updateScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    pauseSchedule: jest.fn().mockResolvedValue(undefined),
    pauseScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    resumeScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    deleteSchedule: jest.fn().mockResolvedValue(undefined),
    deleteScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    getScheduleInfo: jest.fn().mockResolvedValue(null)
};

export const mockWebhookService = {
    processWebhook: jest.fn()
};

export const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
    }
};

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

export { DEFAULT_TEST_WORKSPACE_ID, uuidv4 };

export function createMockTrigger(
    overrides: Partial<{
        id: string;
        workflow_id: string;
        workspace_id: string;
        name: string;
        trigger_type: string;
        config: object;
        enabled: boolean;
        temporal_schedule_id: string | null;
    }> = {}
): MockTrigger {
    return {
        id: overrides.id || uuidv4(),
        workflow_id: overrides.workflow_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Trigger",
        trigger_type: overrides.trigger_type || "schedule",
        config: overrides.config || { cron: "0 9 * * *", timezone: "UTC" },
        enabled: overrides.enabled ?? true,
        temporal_schedule_id: overrides.temporal_schedule_id ?? null,
        last_triggered_at: null,
        trigger_count: 0,
        created_at: new Date(),
        updated_at: new Date()
    };
}

export function createMockWorkflow(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        definition: object;
    }> = {}
): MockWorkflow {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Workflow",
        definition: overrides.definition || {
            nodes: { input: { id: "input", type: "input" } },
            edges: []
        },
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

// ============================================================================
// RESET HELPERS
// ============================================================================

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset default behaviors
    mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockTriggerRepo.findByWorkspaceId.mockResolvedValue([]);
    mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockTriggerRepo.findByWorkflowId.mockResolvedValue([]);
    mockTriggerRepo.findByType.mockResolvedValue([]);
    mockTriggerRepo.findScheduledTriggersToProcess.mockResolvedValue([]);
    mockTriggerRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockTrigger({ ...data, id: uuidv4() }))
    );
    mockTriggerRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockTrigger({ id, ...data }))
    );
    mockTriggerRepo.delete.mockResolvedValue(true);
    mockTriggerRepo.createExecution.mockResolvedValue({ id: uuidv4() });
    mockTriggerRepo.recordTrigger.mockResolvedValue(undefined);

    mockWorkflowRepo.findById.mockResolvedValue(null);
    mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockExecutionRepo.create.mockResolvedValue({
        id: uuidv4(),
        status: "pending",
        workflow_id: uuidv4()
    });
}

// ============================================================================
// SERVER HELPERS
// ============================================================================

export async function createTriggerTestServer(): Promise<FastifyInstance> {
    return createTestServer();
}

export async function closeTriggerTestServer(fastify: FastifyInstance): Promise<void> {
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
