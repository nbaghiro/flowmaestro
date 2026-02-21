/**
 * Persona Instances Test Utilities
 *
 * Shared mocks and helper functions for persona instance tests.
 */

import { v4 as uuidv4 } from "uuid";
import { DEFAULT_TEST_WORKSPACE_ID } from "../../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// MOCKS
// ============================================================================

export const mockPersonaInstanceRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    skipClarification: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    getDashboard: jest.fn(),
    countNeedsAttention: jest.fn()
};

export const mockPersonaDefinitionRepo = {
    findBySlug: jest.fn(),
    findById: jest.fn()
};

export const mockPersonaApprovalRepo = {
    findPendingByWorkspaceId: jest.fn(),
    countPendingByWorkspaceId: jest.fn(),
    findByInstanceId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    extendExpiration: jest.fn(),
    findExpiredPending: jest.fn(),
    findExpiringSoon: jest.fn(),
    markWarned: jest.fn()
};

export const mockPersonaConnectionRepo = {
    findByInstanceIdWithDetails: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

export const mockPersonaDeliverableRepo = {
    getSummariesByInstanceId: jest.fn(),
    findById: jest.fn(),
    getContent: jest.fn(),
    delete: jest.fn()
};

export const mockPersonaTaskTemplateRepo = {
    incrementUsageCount: jest.fn()
};

export const mockConnectionRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

export const mockThreadRepo = {
    create: jest.fn()
};

export const mockAgentExecutionRepo = {
    create: jest.fn()
};

export const mockPersonaInstanceMessageRepo = {
    create: jest.fn()
};

export const mockTemporalHandle = {
    signal: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined)
};

export const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

export const mockEventBus = {
    emit: jest.fn().mockResolvedValue(undefined),
    publishJson: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined)
};

// ============================================================================
// TEST HELPERS
// ============================================================================

export function createMockPersonaInstance(
    overrides: Partial<{
        id: string;
        persona_definition_id: string;
        user_id: string;
        workspace_id: string;
        task_title: string | null;
        task_description: string;
        status: string;
        thread_id: string | null;
        execution_id: string | null;
        max_duration_hours: number;
        max_cost_credits: number;
        accumulated_cost_credits: number;
        iteration_count: number;
        clarification_skipped: boolean;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        persona_definition_id: overrides.persona_definition_id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        task_title: overrides.task_title ?? "Test Task",
        task_description: overrides.task_description || "Test task description",
        status: overrides.status || "pending",
        thread_id: overrides.thread_id ?? null,
        execution_id: overrides.execution_id ?? null,
        max_duration_hours: overrides.max_duration_hours ?? 4,
        max_cost_credits: overrides.max_cost_credits ?? 100,
        accumulated_cost_credits: overrides.accumulated_cost_credits ?? 0,
        iteration_count: overrides.iteration_count ?? 0,
        additional_context: {},
        structured_inputs: {},
        progress: null,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        completion_reason: null,
        notification_config: { on_approval_needed: true, on_completion: true },
        sandbox_id: null,
        sandbox_state: null,
        template_id: null,
        template_variables: {},
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

export function createMockPersonaDefinition(
    overrides: Partial<{
        id: string;
        name: string;
        slug: string;
        default_max_duration_hours: number;
        default_max_cost_credits: number;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "Research Assistant",
        slug: overrides.slug || "research-assistant",
        title: "Research Assistant",
        description: "A helpful research assistant",
        category: "research",
        avatar_url: null,
        default_max_duration_hours: overrides.default_max_duration_hours ?? 4,
        default_max_cost_credits: overrides.default_max_cost_credits ?? 100,
        status: "active",
        created_at: new Date(),
        updated_at: new Date()
    };
}

export function createMockApprovalRequest(
    overrides: Partial<{
        id: string;
        instance_id: string;
        action_type: string;
        tool_name: string | null;
        action_description: string;
        risk_level: string;
        status: string;
        expires_at: Date | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        instance_id: overrides.instance_id || uuidv4(),
        action_type: overrides.action_type || "tool_call",
        tool_name: overrides.tool_name ?? "slack_send_message",
        action_description: overrides.action_description || "Send a message",
        action_arguments: { channel: "#general" },
        risk_level: overrides.risk_level || "medium",
        estimated_cost_credits: 5,
        agent_context: null,
        alternatives: null,
        status: overrides.status || "pending",
        responded_by: null,
        responded_at: null,
        response_note: null,
        created_at: new Date(),
        expires_at: overrides.expires_at ?? null
    };
}

export function createMockDeliverable(
    overrides: Partial<{
        id: string;
        instance_id: string;
        name: string;
        type: string;
        content: string | null;
        file_url: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        instance_id: overrides.instance_id || uuidv4(),
        name: overrides.name || "Research Report",
        description: "A comprehensive report",
        type: overrides.type || "markdown",
        content: overrides.content ?? "# Report\n\nContent here.",
        file_url: overrides.file_url ?? null,
        file_size_bytes: 100,
        file_extension: null,
        preview: "# Report",
        created_at: new Date()
    };
}

export function createMockConnection(
    overrides: Partial<{
        id: string;
        name: string;
        provider: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        name: overrides.name || "My Slack",
        provider: overrides.provider || "slack",
        connection_method: "oauth2",
        status: "active"
    };
}

export function resetAllMocks(): void {
    jest.clearAllMocks();

    // Reset instance repo
    mockPersonaInstanceRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockPersonaInstance({ ...data, id: uuidv4() }))
    );
    mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockPersonaInstanceRepo.findByUserId.mockResolvedValue({ instances: [], total: 0 });
    mockPersonaInstanceRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockPersonaInstance({ id, ...data }))
    );
    mockPersonaInstanceRepo.softDelete.mockResolvedValue(true);
    mockPersonaInstanceRepo.delete.mockResolvedValue(true);
    mockPersonaInstanceRepo.updateStatus.mockImplementation((id, status) =>
        Promise.resolve(createMockPersonaInstance({ id, status }))
    );
    mockPersonaInstanceRepo.skipClarification.mockImplementation((id) =>
        Promise.resolve(
            createMockPersonaInstance({ id, status: "running", clarification_skipped: true })
        )
    );
    mockPersonaInstanceRepo.getDashboard.mockResolvedValue({
        needs_attention: 0,
        running: 0,
        recent_completed: []
    });
    mockPersonaInstanceRepo.countNeedsAttention.mockResolvedValue(0);

    // Reset persona definition repo
    mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);
    mockPersonaDefinitionRepo.findById.mockResolvedValue(null);

    // Reset approval repo
    mockPersonaApprovalRepo.findPendingByWorkspaceId.mockResolvedValue([]);
    mockPersonaApprovalRepo.countPendingByWorkspaceId.mockResolvedValue(0);
    mockPersonaApprovalRepo.findByInstanceId.mockResolvedValue([]);
    mockPersonaApprovalRepo.findById.mockResolvedValue(null);
    mockPersonaApprovalRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockApprovalRequest({ id, ...data }))
    );

    // Reset connection repos
    mockPersonaConnectionRepo.findByInstanceIdWithDetails.mockResolvedValue([]);
    mockPersonaConnectionRepo.create.mockResolvedValue({});
    mockPersonaConnectionRepo.delete.mockResolvedValue(true);
    mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    // Reset deliverable repo
    mockPersonaDeliverableRepo.getSummariesByInstanceId.mockResolvedValue([]);
    mockPersonaDeliverableRepo.findById.mockResolvedValue(null);
    mockPersonaDeliverableRepo.getContent.mockResolvedValue(null);
    mockPersonaDeliverableRepo.delete.mockResolvedValue(true);

    // Reset template repo
    mockPersonaTaskTemplateRepo.incrementUsageCount.mockResolvedValue(undefined);

    // Reset thread repo
    mockThreadRepo.create.mockImplementation((data) => Promise.resolve({ id: uuidv4(), ...data }));

    // Reset execution repo
    mockAgentExecutionRepo.create.mockImplementation((data) =>
        Promise.resolve({ id: uuidv4(), ...data })
    );

    // Reset Temporal mocks
    mockTemporalHandle.signal.mockResolvedValue(undefined);
    mockTemporalHandle.cancel.mockResolvedValue(undefined);
    mockTemporalClient.workflow.start.mockResolvedValue(mockTemporalHandle);

    // Reset event bus
    mockEventBus.emit.mockResolvedValue(undefined);
}
