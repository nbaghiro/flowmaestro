/**
 * Trigger Routes Integration Tests
 *
 * Tests for trigger management endpoints including:
 * - CRUD operations
 * - Schedule triggers
 * - Webhook triggers
 * - Manual trigger execution
 * - Trigger providers
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock trigger repository
const mockTriggerRepo = {
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

// Mock workflow repository
const mockWorkflowRepo = {
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

// Mock execution repository
const mockExecutionRepo = {
    create: jest.fn()
};

jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
}));

jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

jest.mock("../../../../storage/repositories/ExecutionRepository", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo),
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo),
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

// Mock scheduler service
const mockSchedulerService = {
    createScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    updateSchedule: jest.fn().mockResolvedValue(undefined),
    pauseSchedule: jest.fn().mockResolvedValue(undefined),
    deleteSchedule: jest.fn().mockResolvedValue(undefined),
    deleteScheduledTrigger: jest.fn().mockResolvedValue(undefined),
    getScheduleInfo: jest.fn().mockResolvedValue(null)
};

jest.mock("../../../../temporal/core/services/scheduler", () => ({
    SchedulerService: jest.fn().mockImplementation(() => mockSchedulerService)
}));

// Mock webhook service
const mockWebhookService = {
    processWebhook: jest.fn()
};

jest.mock("../../../../temporal/core/services/webhook", () => ({
    WebhookService: jest.fn().mockImplementation(() => mockWebhookService),
    WebhookRequestData: {}
}));

// Mock Temporal client
const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
    }
};

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

// Mock workflow converter
jest.mock("../../../../core/utils/workflow-converter", () => ({
    convertFrontendToBackend: jest.fn().mockImplementation((def) => ({
        name: "Converted",
        nodes: def.nodes || {},
        edges: def.edges || [],
        entryPoint: "input"
    })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] })
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
} from "../../../../../tests/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockTrigger(
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
) {
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

function createMockWorkflow(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        definition: object;
    }> = {}
) {
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

function resetAllMocks() {
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
// TESTS
// ============================================================================

describe("Trigger Routes", () => {
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
    // LIST TRIGGERS
    // ========================================================================

    describe("GET /triggers", () => {
        it("should list triggers for a workflow", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const triggers = [
                createMockTrigger({ workflow_id: workflowId, name: "Trigger 1" }),
                createMockTrigger({ workflow_id: workflowId, name: "Trigger 2" })
            ];
            mockTriggerRepo.findByWorkspaceId.mockResolvedValue(triggers);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/triggers",
                query: { workflowId }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(2);
        });

        it("should filter triggers by type", async () => {
            const testUser = createTestUser();
            const triggers = [createMockTrigger({ trigger_type: "schedule" })];
            mockTriggerRepo.findByWorkspaceId.mockResolvedValue(triggers);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/triggers",
                query: { type: "schedule" }
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ type: "schedule" })
            );
        });

        it("should filter by enabled status", async () => {
            const testUser = createTestUser();
            mockTriggerRepo.findByWorkspaceId.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/triggers",
                query: { type: "schedule", enabled: "true" }
            });

            expect(mockTriggerRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ type: "schedule", enabled: true })
            );
        });

        it("should return triggers for workspace", async () => {
            const testUser = createTestUser();
            mockTriggerRepo.findByWorkspaceId.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/triggers"
            });

            expect(mockTriggerRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/triggers"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // CREATE TRIGGER
    // ========================================================================

    describe("POST /triggers", () => {
        it("should create schedule trigger", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const triggerData = {
                workflowId,
                name: "Daily Schedule",
                triggerType: "schedule",
                config: {
                    cron: "0 9 * * *",
                    timezone: "America/New_York"
                }
            };

            // Mock workflow exists in workspace
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockWorkflow({ id: workflowId })
            );

            const createdTrigger = createMockTrigger({
                workflow_id: workflowId,
                name: "Daily Schedule",
                trigger_type: "schedule"
            });
            mockTriggerRepo.create.mockResolvedValue(createdTrigger);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/triggers",
                payload: triggerData
            });

            expectStatus(response, 201);
            expect(mockSchedulerService.createScheduledTrigger).toHaveBeenCalled();
        });

        it("should create webhook trigger", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const triggerData = {
                workflowId,
                name: "Webhook Trigger",
                triggerType: "webhook",
                config: {
                    secret: "webhook-secret",
                    allowedMethods: ["POST"]
                }
            };

            // Mock workflow exists in workspace
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockWorkflow({ id: workflowId })
            );

            const createdTrigger = createMockTrigger({
                workflow_id: workflowId,
                trigger_type: "webhook"
            });
            mockTriggerRepo.create.mockResolvedValue(createdTrigger);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/triggers",
                payload: triggerData
            });

            expectStatus(response, 201);
            // Webhook triggers don't create Temporal schedules
            expect(mockSchedulerService.createScheduledTrigger).not.toHaveBeenCalled();
        });

        it("should create manual trigger", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const triggerData = {
                workflowId,
                name: "Manual Trigger",
                triggerType: "manual",
                config: {
                    inputs: { key: "default-value" }
                }
            };

            // Mock workflow exists in workspace
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockWorkflow({ id: workflowId })
            );

            const createdTrigger = createMockTrigger({
                workflow_id: workflowId,
                trigger_type: "manual"
            });
            mockTriggerRepo.create.mockResolvedValue(createdTrigger);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/triggers",
                payload: triggerData
            });

            expectStatus(response, 201);
        });

        it("should create disabled trigger when enabled=false", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const triggerData = {
                workflowId,
                name: "Disabled Trigger",
                triggerType: "schedule",
                config: { cron: "0 * * * *" },
                enabled: false
            };

            // Mock workflow exists in workspace
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockWorkflow({ id: workflowId })
            );
            mockTriggerRepo.create.mockResolvedValue(createMockTrigger({ enabled: false }));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/triggers",
                payload: triggerData
            });

            expectStatus(response, 201);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/triggers",
                payload: {
                    workflowId: uuidv4(),
                    name: "Test",
                    triggerType: "schedule",
                    config: {}
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET TRIGGER BY ID
    // ========================================================================

    describe("GET /triggers/:id", () => {
        it("should return trigger details", async () => {
            const testUser = createTestUser();
            const trigger = createMockTrigger({
                id: uuidv4(),
                name: "My Trigger"
            });
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/triggers/${trigger.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("My Trigger");
        });

        it("should include schedule info for schedule triggers", async () => {
            const testUser = createTestUser();
            const trigger = createMockTrigger({
                trigger_type: "schedule",
                temporal_schedule_id: "schedule-123"
            });
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockSchedulerService.getScheduleInfo.mockResolvedValue({
                nextRunTime: new Date(),
                paused: false
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/triggers/${trigger.id}`
            });

            expectStatus(response, 200);
            const body = response.json<{ data: { scheduleInfo: object } }>();
            expect(body.data.scheduleInfo).toBeDefined();
        });

        it("should return 404 for non-existent trigger", async () => {
            const testUser = createTestUser();
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/triggers/${uuidv4()}`
            });

            expectStatus(response, 404);
        });
    });

    // ========================================================================
    // DELETE TRIGGER
    // ========================================================================

    describe("DELETE /triggers/:id", () => {
        it("should delete trigger", async () => {
            const testUser = createTestUser();
            const trigger = createMockTrigger({ id: uuidv4() });
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/triggers/${trigger.id}`
            });

            expectStatus(response, 200);
            expect(mockTriggerRepo.delete).toHaveBeenCalledWith(trigger.id);
        });

        it("should delete Temporal schedule for schedule triggers", async () => {
            const testUser = createTestUser();
            const trigger = createMockTrigger({
                trigger_type: "schedule",
                temporal_schedule_id: "schedule-123"
            });
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);

            await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/triggers/${trigger.id}`
            });

            expect(mockSchedulerService.deleteScheduledTrigger).toHaveBeenCalled();
        });

        it("should return 404 for non-existent trigger", async () => {
            const testUser = createTestUser();
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/triggers/${uuidv4()}`
            });

            expectStatus(response, 404);
        });
    });

    // ========================================================================
    // EXECUTE TRIGGER (MANUAL)
    // ========================================================================

    describe("POST /triggers/:id/execute", () => {
        it("should execute trigger manually", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const trigger = createMockTrigger({
                workflow_id: workflow.id,
                trigger_type: "manual",
                enabled: true
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/triggers/${trigger.id}/execute`,
                payload: { inputs: { key: "value" } }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ executionId: string }>(response);
            expect(body.data.executionId).toBeDefined();
        });

        it("should return 400 for disabled trigger", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const trigger = createMockTrigger({
                workflow_id: workflow.id,
                enabled: false
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/triggers/${trigger.id}/execute`
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent trigger", async () => {
            const testUser = createTestUser();
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/triggers/${uuidv4()}/execute`
            });

            expectStatus(response, 404);
        });

        it("should return 404 for non-existent workflow", async () => {
            const testUser = createTestUser();
            const trigger = createMockTrigger({ enabled: true });
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/triggers/${trigger.id}/execute`
            });

            expectStatus(response, 404);
        });
    });

    // ========================================================================
    // WEBHOOK RECEIVER (PUBLIC)
    // ========================================================================

    describe("POST /webhooks/:triggerId", () => {
        it("should process webhook and trigger workflow", async () => {
            const triggerId = uuidv4();
            mockWebhookService.processWebhook.mockResolvedValue({
                success: true,
                statusCode: 200,
                executionId: uuidv4(),
                message: "Webhook processed successfully"
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/webhooks/${triggerId}`,
                payload: { event: "test", data: { key: "value" } }
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; executionId: string }>();
            expect(body.success).toBe(true);
            expect(body.executionId).toBeDefined();
        });

        it("should return error for invalid trigger", async () => {
            const triggerId = uuidv4();
            mockWebhookService.processWebhook.mockResolvedValue({
                success: false,
                statusCode: 404,
                error: "Trigger not found"
            });

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/webhooks/${triggerId}`,
                payload: {}
            });

            expectStatus(response, 404);
        });

        it("should work without authentication (public endpoint)", async () => {
            const triggerId = uuidv4();
            mockWebhookService.processWebhook.mockResolvedValue({
                success: true,
                statusCode: 200,
                executionId: uuidv4()
            });

            // No auth token provided
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/webhooks/${triggerId}`,
                payload: { test: true }
            });

            // Should succeed without auth
            expectStatus(response, 200);
        });
    });

    // ========================================================================
    // EDGE CASES
    // ========================================================================

    describe("Edge Cases", () => {
        it("should handle trigger with complex cron expression", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const triggerData = {
                workflowId,
                name: "Complex Schedule",
                triggerType: "schedule",
                config: {
                    cron: "0 0 1,15 * *", // 1st and 15th of each month
                    timezone: "Europe/London"
                }
            };

            // Mock workflow exists in workspace
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(
                createMockWorkflow({ id: workflowId })
            );
            mockTriggerRepo.create.mockResolvedValue(
                createMockTrigger({ config: triggerData.config })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/triggers",
                payload: triggerData
            });

            expectStatus(response, 201);
        });

        it("should handle trigger execution with no inputs", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const trigger = createMockTrigger({
                workflow_id: workflow.id,
                trigger_type: "manual",
                enabled: true
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/triggers/${trigger.id}/execute`,
                payload: {} // No inputs
            });

            expectStatus(response, 200);
        });
    });
});
