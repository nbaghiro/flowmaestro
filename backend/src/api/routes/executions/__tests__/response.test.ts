/**
 * Execution Response Route Tests
 *
 * Tests for submitting responses to paused executions.
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
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockExecutionRepo,
    mockWorkflowRepo,
    mockTemporalClient,
    mockTemporalHandle,
    createMockExecution,
    createMockWorkflow,
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

describe("Execution Routes - Response", () => {
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
});
