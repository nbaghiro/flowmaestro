/**
 * Trigger CRUD Operations Tests
 *
 * Tests for listing, creating, getting, deleting, and updating triggers.
 */

import { FastifyInstance } from "fastify";
import {
    mockTriggerRepo,
    mockWorkflowRepo,
    mockExecutionRepo,
    mockSchedulerService,
    createMockTrigger,
    createMockWorkflow,
    resetAllMocks,
    createTriggerTestServer,
    closeTriggerTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    uuidv4,
    DEFAULT_TEST_WORKSPACE_ID
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

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

jest.mock("../../../../temporal/core/services/scheduler", () => ({
    SchedulerService: jest.fn().mockImplementation(() => mockSchedulerService)
}));

jest.mock("../../../../temporal/core/services/webhook", () => ({
    WebhookService: jest.fn().mockImplementation(() => ({
        processWebhook: jest.fn()
    })),
    WebhookRequestData: {}
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue({
        workflow: {
            start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
        }
    }),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("@flowmaestro/shared", () => ({
    ...jest.requireActual("@flowmaestro/shared"),
    convertFrontendToBackend: jest.fn().mockImplementation((def) => ({
        name: "Converted",
        nodes: def.nodes || {},
        edges: def.edges || [],
        entryPoint: "input"
    })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] })
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Trigger CRUD Operations", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTriggerTestServer();
    });

    afterAll(async () => {
        await closeTriggerTestServer(fastify);
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
    // UPDATE TRIGGER
    // ========================================================================
    describe("PUT /triggers/:id", () => {
        it("should update trigger name", async () => {
            const testUser = createTestUser();
            const triggerId = uuidv4();
            const trigger = createMockTrigger({
                id: triggerId,
                name: "Old Name",
                trigger_type: "manual"
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockTriggerRepo.update.mockResolvedValue({
                ...trigger,
                name: "New Name"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/triggers/${triggerId}`,
                payload: { name: "New Name" }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("New Name");
        });

        it("should update trigger enabled status", async () => {
            const testUser = createTestUser();
            const triggerId = uuidv4();
            const trigger = createMockTrigger({
                id: triggerId,
                trigger_type: "manual",
                enabled: true
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockTriggerRepo.update.mockResolvedValue({
                ...trigger,
                enabled: false
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/triggers/${triggerId}`,
                payload: { enabled: false }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ enabled: boolean }>(response);
            expect(body.data.enabled).toBe(false);
        });

        it("should update schedule trigger config and update Temporal schedule", async () => {
            const testUser = createTestUser();
            const triggerId = uuidv4();
            const trigger = createMockTrigger({
                id: triggerId,
                trigger_type: "schedule",
                config: { cron: "0 9 * * *", timezone: "UTC" }
            });

            const newConfig = { cron: "0 12 * * *", timezone: "America/New_York" };

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockTriggerRepo.update.mockResolvedValue({
                ...trigger,
                config: newConfig
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/triggers/${triggerId}`,
                payload: { config: newConfig }
            });

            expectStatus(response, 200);
            expect(mockSchedulerService.updateScheduledTrigger).toHaveBeenCalledWith(
                triggerId,
                newConfig
            );
        });

        it("should pause schedule trigger when disabled", async () => {
            const testUser = createTestUser();
            const triggerId = uuidv4();
            const trigger = createMockTrigger({
                id: triggerId,
                trigger_type: "schedule",
                enabled: true
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockTriggerRepo.update.mockResolvedValue({
                ...trigger,
                enabled: false
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/triggers/${triggerId}`,
                payload: { enabled: false }
            });

            expectStatus(response, 200);
            expect(mockSchedulerService.pauseScheduledTrigger).toHaveBeenCalledWith(triggerId);
        });

        it("should resume schedule trigger when enabled", async () => {
            const testUser = createTestUser();
            const triggerId = uuidv4();
            const trigger = createMockTrigger({
                id: triggerId,
                trigger_type: "schedule",
                enabled: false
            });

            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(trigger);
            mockTriggerRepo.update.mockResolvedValue({
                ...trigger,
                enabled: true
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/triggers/${triggerId}`,
                payload: { enabled: true }
            });

            expectStatus(response, 200);
            expect(mockSchedulerService.resumeScheduledTrigger).toHaveBeenCalledWith(triggerId);
        });

        it("should return 404 for non-existent trigger", async () => {
            const testUser = createTestUser();
            mockTriggerRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/triggers/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "PUT",
                url: `/triggers/${uuidv4()}`,
                payload: { name: "Test" }
            });

            expectErrorResponse(response, 401);
        });
    });
});
