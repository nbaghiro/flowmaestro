/**
 * Trigger Execution Tests
 *
 * Tests for manual trigger execution, webhook receivers, and edge cases.
 */

import { FastifyInstance } from "fastify";
import {
    mockTriggerRepo,
    mockWorkflowRepo,
    mockExecutionRepo,
    mockSchedulerService,
    mockWebhookService,
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
    uuidv4
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
    WebhookService: jest.fn().mockImplementation(() => mockWebhookService),
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

describe("Trigger Execution Operations", () => {
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

            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/webhooks/${triggerId}`,
                payload: { test: true }
            });

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
