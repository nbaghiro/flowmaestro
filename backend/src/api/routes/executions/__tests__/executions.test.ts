/**
 * Execution Routes Integration Tests
 *
 * Tests for execution management endpoints including:
 * - List executions (with filters)
 * - Get execution details
 * - Cancel execution
 * - Get execution logs
 * - Submit response to paused execution
 * - Stream execution events (SSE)
 * - Multi-tenant isolation
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock execution repository
const mockExecutionRepo = {
    findAll: jest.fn(),
    findByWorkflowId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    getLogs: jest.fn()
};

// Mock workflow repository
const mockWorkflowRepo = {
    findById: jest.fn()
};

jest.mock("../../../../storage/repositories", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo),
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

// Mock Temporal client for cancel and signal
const mockTemporalHandle = {
    cancel: jest.fn().mockResolvedValue(undefined),
    signal: jest.fn().mockResolvedValue(undefined)
};

const mockTemporalClient = {
    workflow: {
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

// Note: Redis event bus and SSE mocks are already set up in fastify-test-client.ts

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockExecution(
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

function createMockWorkflow(
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

function createMockLog(
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

function resetAllMocks() {
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

// ============================================================================
// TESTS
// ============================================================================

describe("Execution Routes", () => {
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
    // LIST EXECUTIONS
    // ========================================================================

    describe("GET /executions", () => {
        it("should list executions for user's workflows", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const executions = [
                createMockExecution({ workflow_id: workflow.id, status: "completed" }),
                createMockExecution({ workflow_id: workflow.id, status: "running" })
            ];

            mockExecutionRepo.findAll.mockResolvedValue({
                executions,
                total: 2
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/executions"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: object[];
                total: number;
            }>(response);
            expect(body.data.items).toHaveLength(2);
        });

        it("should filter executions by workflowId", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const executions = [createMockExecution({ workflow_id: workflow.id })];

            mockWorkflowRepo.findById.mockResolvedValue(workflow);
            mockExecutionRepo.findByWorkflowId.mockResolvedValue({
                executions,
                total: 1
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/executions",
                query: { workflowId: workflow.id }
            });

            expectStatus(response, 200);
            expect(mockExecutionRepo.findByWorkflowId).toHaveBeenCalledWith(
                workflow.id,
                expect.any(Object)
            );
        });

        it("should filter executions by status", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);
            mockExecutionRepo.findAll.mockResolvedValue({
                executions: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/executions",
                query: { status: "running" }
            });

            expect(mockExecutionRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ status: "running" })
            );
        });

        it("should respect pagination parameters", async () => {
            const testUser = createTestUser();
            mockExecutionRepo.findAll.mockResolvedValue({
                executions: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/executions",
                query: { limit: "10", offset: "5" }
            });

            expect(mockExecutionRepo.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ limit: 10, offset: 5 })
            );
        });

        it("should return empty list for other user's workflow", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const workflow = createMockWorkflow({ user_id: otherUserId });

            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/executions",
                query: { workflowId: workflow.id }
            });

            expectStatus(response, 200);
            const body = response.json<{ data: { items: object[] } }>();
            expect(body.data.items).toHaveLength(0);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/executions"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET EXECUTION BY ID
    // ========================================================================

    describe("GET /executions/:id", () => {
        it("should return execution details for owner", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                id: uuidv4(),
                workflow_id: workflow.id,
                status: "completed"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; status: string }>(response);
            expect(body.data.status).toBe("completed");
        });

        it("should include node outputs in response", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                node_outputs: {
                    node1: { result: "value1" },
                    node2: { result: "value2" }
                }
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}`
            });

            expectStatus(response, 200);
            const body = response.json<{ data: { node_outputs: object } }>();
            expect(body.data.node_outputs).toBeDefined();
        });

        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other user's execution (multi-tenant)", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const workflow = createMockWorkflow({ user_id: otherUserId });
            const execution = createMockExecution({ workflow_id: workflow.id });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}`
            });

            // Should return 404, not 403, to not reveal execution existence
            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // CANCEL EXECUTION
    // ========================================================================

    describe("POST /executions/:id/cancel", () => {
        it("should cancel running execution", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                id: uuidv4(),
                workflow_id: workflow.id,
                status: "running"
            });

            mockExecutionRepo.findById
                .mockResolvedValueOnce(execution)
                .mockResolvedValueOnce({ ...execution, status: "cancelled" });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/cancel`
            });

            expectStatus(response, 200);
            expect(mockTemporalHandle.cancel).toHaveBeenCalled();
            expect(mockExecutionRepo.update).toHaveBeenCalledWith(
                execution.id,
                expect.objectContaining({ status: "cancelled" })
            );
        });

        it("should return 400 for already completed execution", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "completed"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/cancel`
            });

            expectStatus(response, 400);
        });

        it("should return 400 for failed execution", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "failed"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/cancel`
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${uuidv4()}/cancel`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other user's execution", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const workflow = createMockWorkflow({ user_id: otherUserId });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "running"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/cancel`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // GET EXECUTION LOGS
    // ========================================================================

    describe("GET /executions/:id/logs", () => {
        it("should return execution logs for owner", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({ workflow_id: workflow.id });
            const logs = [
                createMockLog({ execution_id: execution.id, level: "info" }),
                createMockLog({ execution_id: execution.id, level: "debug" })
            ];

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);
            mockExecutionRepo.getLogs.mockResolvedValue({ logs, total: 2 });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}/logs`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ items: object[] }>(response);
            expect(body.data.items).toHaveLength(2);
        });

        it("should filter logs by level", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({ workflow_id: workflow.id });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);
            mockExecutionRepo.getLogs.mockResolvedValue({ logs: [], total: 0 });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}/logs`,
                query: { level: "error" }
            });

            expect(mockExecutionRepo.getLogs).toHaveBeenCalledWith(
                execution.id,
                expect.objectContaining({ level: "error" })
            );
        });

        it("should filter logs by nodeId", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({ workflow_id: workflow.id });
            const nodeId = "node-123";

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);
            mockExecutionRepo.getLogs.mockResolvedValue({ logs: [], total: 0 });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}/logs`,
                query: { nodeId }
            });

            expect(mockExecutionRepo.getLogs).toHaveBeenCalledWith(
                execution.id,
                expect.objectContaining({ nodeId })
            );
        });

        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${uuidv4()}/logs`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other user's execution logs", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const workflow = createMockWorkflow({ user_id: otherUserId });
            const execution = createMockExecution({ workflow_id: workflow.id });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}/logs`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // SUBMIT RESPONSE TO PAUSED EXECUTION
    // ========================================================================

    describe("POST /executions/:id/submit-response", () => {
        it("should submit response to paused execution", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                id: uuidv4(),
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "user-input-node",
                    nodeName: "User Input",
                    inputType: "text",
                    variableName: "userResponse",
                    required: false
                }
            });

            mockExecutionRepo.findById
                .mockResolvedValueOnce(execution)
                .mockResolvedValueOnce({ ...execution, status: "running", pause_context: null });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);
            mockExecutionRepo.update.mockResolvedValue({
                ...execution,
                status: "running",
                pause_context: null
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "User's answer" }
            });

            expectStatus(response, 200);
            expect(mockExecutionRepo.update).toHaveBeenCalledWith(
                execution.id,
                expect.objectContaining({
                    status: "running",
                    pause_context: null
                })
            );
            expect(mockTemporalHandle.signal).toHaveBeenCalledWith(
                "humanReviewResponse",
                expect.objectContaining({
                    variableName: "userResponse",
                    response: "User's answer"
                })
            );
        });

        it("should return 400 for non-paused execution", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "running"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "test" }
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("running");
        });

        it("should return 400 for completed execution", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "completed"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "test" }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for paused execution without pause context", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "paused",
                pause_context: null
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "test" }
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("pause context");
        });

        it("should return 400 for required field with empty response", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "user-input-node",
                    inputType: "text",
                    variableName: "userResponse",
                    required: true
                }
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "" }
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("required");
        });

        it("should validate number input type", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "user-input-node",
                    inputType: "number",
                    variableName: "userNumber",
                    required: false
                }
            });

            mockExecutionRepo.findById
                .mockResolvedValueOnce(execution)
                .mockResolvedValueOnce({ ...execution, status: "running" });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            // Valid number
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: 42 }
            });

            expectStatus(response, 200);
        });

        it("should return 400 for invalid number input", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "user-input-node",
                    inputType: "number",
                    variableName: "userNumber",
                    required: false
                }
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "not-a-number" }
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("number");
        });

        it("should validate boolean input type", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "user-input-node",
                    inputType: "boolean",
                    variableName: "userConfirm",
                    required: false
                }
            });

            mockExecutionRepo.findById
                .mockResolvedValueOnce(execution)
                .mockResolvedValueOnce({ ...execution, status: "running" });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: true }
            });

            expectStatus(response, 200);
        });

        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${uuidv4()}/submit-response`,
                payload: { response: "test" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other user's execution", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const workflow = createMockWorkflow({ user_id: otherUserId });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "node",
                    inputType: "text",
                    variableName: "var"
                }
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "test" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/executions/${uuidv4()}/submit-response`,
                payload: { response: "test" }
            });

            expectErrorResponse(response, 401);
        });

        it("should store response in execution state", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({ user_id: testUser.id });
            const execution = createMockExecution({
                id: uuidv4(),
                workflow_id: workflow.id,
                status: "paused",
                pause_context: {
                    nodeId: "user-input-node",
                    inputType: "text",
                    variableName: "customVar",
                    required: false
                },
                current_state: { existingData: "keep" }
            });

            mockExecutionRepo.findById
                .mockResolvedValueOnce(execution)
                .mockResolvedValueOnce({ ...execution, status: "running" });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/executions/${execution.id}/submit-response`,
                payload: { response: "User input" }
            });

            // Verify update was called with the response stored in current_state
            expect(mockExecutionRepo.update).toHaveBeenCalledWith(
                execution.id,
                expect.objectContaining({
                    status: "running",
                    pause_context: null,
                    current_state: expect.objectContaining({
                        existingData: "keep",
                        customVar: "User input"
                    })
                })
            );
        });
    });

    // ========================================================================
    // STREAM EXECUTION EVENTS (SSE)
    // ========================================================================

    describe("GET /executions/:id/stream", () => {
        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${uuidv4()}/stream`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 for other user's execution", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const workflow = createMockWorkflow({ user_id: otherUserId });
            const execution = createMockExecution({
                workflow_id: workflow.id,
                status: "running"
            });

            mockExecutionRepo.findById.mockResolvedValue(execution);
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/executions/${execution.id}/stream`
            });

            // Returns 401 Unauthorized for other user's execution
            expectStatus(response, 401);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/executions/${uuidv4()}/stream`
            });

            expectErrorResponse(response, 401);
        });

        // Note: Full SSE streaming tests require integration testing with actual
        // SSE connections. These tests verify authorization and error handling.
        // See .docs/testing/api-route-test-coverage.md for SSE testing patterns.
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION
    // ========================================================================

    describe("Multi-tenant Isolation", () => {
        it("executions are filtered to user's workflows only", async () => {
            const testUser = createTestUser();
            const userWorkflow = createMockWorkflow({ user_id: testUser.id });
            const otherWorkflow = createMockWorkflow({ user_id: uuidv4() });

            const allExecutions = [
                createMockExecution({ workflow_id: userWorkflow.id }),
                createMockExecution({ workflow_id: otherWorkflow.id })
            ];

            mockExecutionRepo.findAll.mockResolvedValue({
                executions: allExecutions,
                total: 2
            });

            // Return user's workflow, but null for other workflow
            mockWorkflowRepo.findById.mockImplementation((id) => {
                if (id === userWorkflow.id) return Promise.resolve(userWorkflow);
                if (id === otherWorkflow.id) return Promise.resolve(otherWorkflow);
                return Promise.resolve(null);
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/executions"
            });

            expectStatus(response, 200);
            // Only user's executions should be returned
            const body = response.json<{ data: { items: object[] } }>();
            expect(body.data.items).toHaveLength(1);
        });
    });
});
