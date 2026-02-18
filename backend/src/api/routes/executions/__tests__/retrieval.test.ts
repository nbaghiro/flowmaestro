/**
 * Execution Retrieval Route Tests
 *
 * Tests for listing and retrieving execution details.
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
    expectSuccessResponse,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockExecutionRepo,
    mockWorkflowRepo,
    mockTemporalClient,
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

describe("Execution Routes - Retrieval", () => {
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
});
