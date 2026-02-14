/**
 * Persona Instances Routes Tests
 *
 * Tests for persona instance management endpoints including:
 * - CRUD operations
 * - Instance actions (message, cancel, complete, continue, skip-clarification)
 * - Connection management
 * - Deliverable management
 * - Approval management
 * - Dashboard and counts
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock persona instance repository
const mockPersonaInstanceRepo = {
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

jest.mock("../../../../storage/repositories/PersonaInstanceRepository", () => ({
    PersonaInstanceRepository: jest.fn().mockImplementation(() => mockPersonaInstanceRepo)
}));

// Mock persona definition repository
const mockPersonaDefinitionRepo = {
    findBySlug: jest.fn(),
    findById: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaDefinitionRepository", () => ({
    PersonaDefinitionRepository: jest.fn().mockImplementation(() => mockPersonaDefinitionRepo)
}));

// Mock persona approval request repository
const mockPersonaApprovalRepo = {
    findPendingByWorkspaceId: jest.fn(),
    countPendingByWorkspaceId: jest.fn(),
    findByInstanceId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaApprovalRequestRepository", () => ({
    PersonaApprovalRequestRepository: jest.fn().mockImplementation(() => mockPersonaApprovalRepo)
}));

// Mock persona instance connection repository
const mockPersonaConnectionRepo = {
    findByInstanceIdWithDetails: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaInstanceConnectionRepository", () => ({
    PersonaInstanceConnectionRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaConnectionRepo)
}));

// Mock persona instance deliverable repository
const mockPersonaDeliverableRepo = {
    getSummariesByInstanceId: jest.fn(),
    findById: jest.fn(),
    getContent: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaInstanceDeliverableRepository", () => ({
    PersonaInstanceDeliverableRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaDeliverableRepo)
}));

// Mock persona task template repository
const mockPersonaTaskTemplateRepo = {
    incrementUsageCount: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaTaskTemplateRepository", () => ({
    PersonaTaskTemplateRepository: jest.fn().mockImplementation(() => mockPersonaTaskTemplateRepo)
}));

// Mock connection repository
const mockConnectionRepo = {
    findByIdAndWorkspaceId: jest.fn()
};

jest.mock("../../../../storage/repositories/ConnectionRepository", () => ({
    ConnectionRepository: jest.fn().mockImplementation(() => mockConnectionRepo)
}));

// Mock thread repository
const mockThreadRepo = {
    create: jest.fn()
};

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
}));

// Mock agent execution repository
const mockAgentExecutionRepo = {
    create: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
}));

// Mock persona instance message repository
const mockPersonaInstanceMessageRepo = {
    create: jest.fn()
};

jest.mock("../../../../storage/repositories/PersonaInstanceMessageRepository", () => ({
    PersonaInstanceMessageRepository: jest
        .fn()
        .mockImplementation(() => mockPersonaInstanceMessageRepo)
}));

// Mock Temporal client
const mockTemporalHandle = {
    signal: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined)
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

// Mock workflow signals
jest.mock("../../../../temporal/workflows/persona-orchestrator", () => ({
    userMessageSignal: "userMessage",
    approvalResponseSignal: "approvalResponse",
    cancelSignal: "cancel",
    skipClarificationSignal: "skipClarification"
}));

// Mock Redis event bus
const mockEventBus = {
    emit: jest.fn().mockResolvedValue(undefined),
    publishJson: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined)
};

jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: mockEventBus,
    RedisEventBus: jest.fn().mockImplementation(() => mockEventBus)
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockPersonaInstance(
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

function createMockPersonaDefinition(
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

function createMockApprovalRequest(
    overrides: Partial<{
        id: string;
        instance_id: string;
        action_type: string;
        tool_name: string | null;
        action_description: string;
        risk_level: string;
        status: string;
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
        expires_at: null
    };
}

function createMockDeliverable(
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

function createMockConnection(
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

function resetAllMocks() {
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

// ============================================================================
// TESTS
// ============================================================================

describe("Persona Instance Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // CREATE PERSONA INSTANCE
    // ========================================================================

    describe("POST /persona-instances", () => {
        it("should create a persona instance", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Research AI market trends"
                }
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; status: string }>(response);
            expect(body.data.status).toBe("initializing");
            expect(mockTemporalClient.workflow.start).toHaveBeenCalled();
        });

        it("should create instance with optional parameters", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Research AI market trends",
                    task_title: "AI Research",
                    max_duration_hours: 2,
                    max_cost_credits: 50,
                    skip_clarification: true
                }
            });

            expectStatus(response, 201);
        });

        it("should grant connections when provided", async () => {
            const testUser = createTestUser();
            const persona = createMockPersonaDefinition({ slug: "research-assistant" });
            const connection = createMockConnection();

            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(persona);
            mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(connection);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Research AI market trends",
                    connections: [{ connection_id: connection.id, scopes: ["read"] }]
                }
            });

            expectStatus(response, 201);
            expect(mockPersonaConnectionRepo.create).toHaveBeenCalled();
        });

        it("should return 404 when persona not found", async () => {
            const testUser = createTestUser();
            mockPersonaDefinitionRepo.findBySlug.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "non-existent",
                    task_description: "Test"
                }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    // Missing persona_slug and task_description
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/persona-instances",
                payload: {
                    persona_slug: "research-assistant",
                    task_description: "Test"
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // LIST PERSONA INSTANCES
    // ========================================================================

    describe("GET /persona-instances", () => {
        it("should list instances for workspace", async () => {
            const testUser = createTestUser();
            const instances = [
                createMockPersonaInstance({ status: "running" }),
                createMockPersonaInstance({ status: "completed" })
            ];

            mockPersonaInstanceRepo.findByUserId.mockResolvedValue({
                instances,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ instances: object[]; total: number }>(response);
            expect(body.data.instances).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should filter by status", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByUserId.mockResolvedValue({
                instances: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances",
                query: { status: "running,waiting_approval" }
            });

            expect(mockPersonaInstanceRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({
                    status: expect.arrayContaining(["running", "waiting_approval"])
                })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/persona-instances"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET PERSONA INSTANCE
    // ========================================================================

    describe("GET /persona-instances/:id", () => {
        it("should return instance by id", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                user_id: testUser.id,
                status: "running"
            });
            const persona = createMockPersonaDefinition();

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaDefinitionRepo.findById.mockResolvedValue(persona);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; status: string }>(response);
            expect(body.data.id).toBe(instanceId);
            expect(body.data.status).toBe("running");
        });

        it("should return 404 when not found", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // DELETE PERSONA INSTANCE
    // ========================================================================

    describe("DELETE /persona-instances/:id", () => {
        it("should delete a pending instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}`
            });

            expectStatus(response, 204);
            expect(mockPersonaInstanceRepo.delete).toHaveBeenCalledWith(instanceId);
        });

        it("should return 400 for running instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "running"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}`
            });

            expectStatus(response, 400);
        });

        it("should return 404 when not found", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // SEND MESSAGE
    // ========================================================================

    describe("POST /persona-instances/:id/message", () => {
        it("should send message to running instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "clarifying"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceMessageRepo.create.mockResolvedValue({ id: uuidv4() });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/message`,
                payload: { content: "Here is more context" }
            });

            expectStatus(response, 200);
            expect(mockTemporalHandle.signal).toHaveBeenCalled();
        });

        it("should return 400 for completed instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "completed"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/message`,
                payload: { content: "Test" }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for empty message", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/message`,
                payload: { content: "" }
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // CANCEL INSTANCE
    // ========================================================================

    describe("POST /persona-instances/:id/cancel", () => {
        it("should cancel a running instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "running"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceRepo.updateStatus.mockResolvedValue({
                ...instance,
                status: "cancelled"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/cancel`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ status: string }>(response);
            expect(body.data.status).toBe("cancelled");
        });

        it("should return 400 for completed instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "completed"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/cancel`
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // DASHBOARD AND COUNTS
    // ========================================================================

    describe("GET /persona-instances/dashboard", () => {
        it("should return dashboard data", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.getDashboard.mockResolvedValue({
                needs_attention: 2,
                running: 3,
                recent_completed: [createMockPersonaInstance({ status: "completed" })]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/dashboard"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                needs_attention: number;
                running: number;
                recent_completed: object[];
            }>(response);
            expect(body.data.needs_attention).toBe(2);
            expect(body.data.running).toBe(3);
        });
    });

    describe("GET /persona-instances/count", () => {
        it("should return instance count", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.countNeedsAttention.mockResolvedValue(5);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/count"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ count: number }>(response);
            expect(body.data.count).toBe(5);
        });
    });

    // ========================================================================
    // CONNECTION MANAGEMENT
    // ========================================================================

    describe("GET /persona-instances/:id/connections", () => {
        it("should list connections for instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const connections = [
                {
                    id: uuidv4(),
                    instance_id: instanceId,
                    connection_id: uuidv4(),
                    granted_scopes: ["read"],
                    connection: {
                        id: uuidv4(),
                        name: "My Slack",
                        provider: "slack",
                        connection_method: "oauth2"
                    },
                    created_at: new Date()
                }
            ];

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaConnectionRepo.findByInstanceIdWithDetails.mockResolvedValue(connections);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/connections`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(1);
        });
    });

    describe("POST /persona-instances/:id/connections", () => {
        it("should grant connection to instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const connectionId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const connection = createMockConnection({ id: connectionId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(connection);
            mockPersonaConnectionRepo.create.mockResolvedValue({
                id: uuidv4(),
                instance_id: instanceId,
                connection_id: connectionId,
                granted_scopes: ["read"]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/connections`,
                payload: { connection_id: connectionId, scopes: ["read"] }
            });

            expectStatus(response, 201);
        });

        it("should return 404 when connection not found", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockConnectionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/connections`,
                payload: { connection_id: uuidv4() }
            });

            expectErrorResponse(response, 404);
        });
    });

    describe("DELETE /persona-instances/:id/connections/:connectionId", () => {
        it("should revoke connection from instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const connectionId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaConnectionRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}/connections/${connectionId}`
            });

            expectStatus(response, 200);
        });
    });

    // ========================================================================
    // DELIVERABLES
    // ========================================================================

    describe("GET /persona-instances/:id/deliverables", () => {
        it("should list deliverables for instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });
            const deliverables = [
                { id: uuidv4(), name: "Report", type: "markdown", preview: "# Report" }
            ];

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.getSummariesByInstanceId.mockResolvedValue(deliverables);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/deliverables`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(1);
        });
    });

    describe("GET /persona-instances/:id/deliverables/:deliverableId", () => {
        it("should return full deliverable", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const deliverableId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });
            const deliverable = createMockDeliverable({
                id: deliverableId,
                instance_id: instanceId
            });

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.findById.mockResolvedValue(deliverable);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/deliverables/${deliverableId}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; content: string }>(response);
            expect(body.data.id).toBe(deliverableId);
        });

        it("should return 404 when deliverable not found", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/deliverables/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    describe("DELETE /persona-instances/:id/deliverables/:deliverableId", () => {
        it("should delete deliverable", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const deliverableId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId, user_id: testUser.id });
            // Create deliverable fixture for reference (used in mock setup)
            createMockDeliverable({
                id: deliverableId,
                instance_id: instanceId
            });

            mockPersonaInstanceRepo.findById.mockResolvedValue(instance);
            mockPersonaDeliverableRepo.delete.mockResolvedValue(true);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/persona-instances/${instanceId}/deliverables/${deliverableId}`
            });

            expectStatus(response, 200);
            expect(mockPersonaDeliverableRepo.delete).toHaveBeenCalledWith(deliverableId);
        });
    });

    // ========================================================================
    // APPROVALS
    // ========================================================================

    describe("GET /persona-instances/approvals", () => {
        it("should list pending approvals for workspace", async () => {
            const testUser = createTestUser();
            const approvals = [createMockApprovalRequest({ status: "pending" })];

            mockPersonaApprovalRepo.findPendingByWorkspaceId.mockResolvedValue(approvals);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/approvals"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ approvals: object[] }>(response);
            expect(body.data.approvals).toHaveLength(1);
        });
    });

    describe("GET /persona-instances/approvals/count", () => {
        it("should return pending approval count", async () => {
            const testUser = createTestUser();
            mockPersonaApprovalRepo.countPendingByWorkspaceId.mockResolvedValue(3);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances/approvals/count"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ count: number }>(response);
            expect(body.data.count).toBe(3);
        });
    });

    describe("GET /persona-instances/:id/approvals", () => {
        it("should list approvals for instance", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approvals = [
                createMockApprovalRequest({ instance_id: instanceId, status: "approved" }),
                createMockApprovalRequest({ instance_id: instanceId, status: "pending" })
            ];

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findByInstanceId.mockResolvedValue(approvals);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${instanceId}/approvals`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ approvals: object[] }>(response);
            expect(body.data.approvals).toHaveLength(2);
        });
    });

    describe("POST /persona-instances/:id/approvals/:approvalId/approve", () => {
        it("should approve a pending approval", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "waiting_approval"
            });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);
            mockPersonaApprovalRepo.update.mockResolvedValue({ ...approval, status: "approved" });
            mockPersonaInstanceRepo.update.mockResolvedValue({ ...instance, status: "running" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/approve`
            });

            expectStatus(response, 200);
            expect(mockPersonaApprovalRepo.update).toHaveBeenCalledWith(
                approvalId,
                expect.objectContaining({ status: "approved" })
            );
        });

        it("should return 400 for already responded approval", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const instance = createMockPersonaInstance({ id: instanceId });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "approved" // Already approved
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/approve`
            });

            expectStatus(response, 400);
        });
    });

    describe("POST /persona-instances/:id/approvals/:approvalId/deny", () => {
        it("should deny a pending approval", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const approvalId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "waiting_approval"
            });
            const approval = createMockApprovalRequest({
                id: approvalId,
                instance_id: instanceId,
                status: "pending"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaApprovalRepo.findById.mockResolvedValue(approval);
            mockPersonaApprovalRepo.update.mockResolvedValue({ ...approval, status: "denied" });
            mockPersonaInstanceRepo.update.mockResolvedValue({ ...instance, status: "running" });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/approvals/${approvalId}/deny`,
                payload: { note: "Too risky" }
            });

            expectStatus(response, 200);
            expect(mockPersonaApprovalRepo.update).toHaveBeenCalledWith(
                approvalId,
                expect.objectContaining({ status: "denied" })
            );
        });
    });

    // ========================================================================
    // SKIP CLARIFICATION
    // ========================================================================

    describe("POST /persona-instances/:id/skip-clarification", () => {
        it("should skip clarification phase", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const executionId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                execution_id: executionId,
                status: "clarifying"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);
            mockPersonaInstanceRepo.skipClarification.mockResolvedValue({
                ...instance,
                status: "running",
                clarification_skipped: true
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/skip-clarification`
            });

            expectStatus(response, 200);
            expect(mockTemporalHandle.signal).toHaveBeenCalled();
        });

        it("should return 400 when not in clarifying status", async () => {
            const testUser = createTestUser();
            const instanceId = uuidv4();
            const instance = createMockPersonaInstance({
                id: instanceId,
                status: "running"
            });

            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(instance);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/persona-instances/${instanceId}/skip-clarification`
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION
    // ========================================================================

    describe("Multi-tenant Isolation", () => {
        it("should not allow access to instances from other workspaces", async () => {
            const testUser = createTestUser();
            // findByIdAndWorkspaceId returns null because workspace doesn't match
            mockPersonaInstanceRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/persona-instances/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should only list instances for current workspace", async () => {
            const testUser = createTestUser();
            mockPersonaInstanceRepo.findByUserId.mockResolvedValue({
                instances: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/persona-instances"
            });

            expect(mockPersonaInstanceRepo.findByUserId).toHaveBeenCalledWith(
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });
    });
});
