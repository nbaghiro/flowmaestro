/**
 * Execution Streaming Route Tests
 *
 * Tests for SSE streaming and multi-tenant isolation.
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

describe("Execution Routes - Streaming", () => {
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
