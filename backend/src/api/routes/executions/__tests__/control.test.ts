/**
 * Execution Control Route Tests
 *
 * Tests for cancelling executions and retrieving logs.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockExecutionRepo,
    mockWorkflowRepo,
    mockTemporalClient,
    mockTemporalHandle,
    createMockExecution,
    createMockWorkflow,
    createMockLog,
    resetAllMocks
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo),
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo),
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    }))
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Execution Routes - Control", () => {
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
});
