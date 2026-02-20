/**
 * v1 Executions Route Tests
 *
 * Tests for execution list, get, cancel, and events endpoints.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    createTestApiKey,
    mockApiKeyRepo,
    parseResponse,
    mockWorkflowRepo,
    mockExecutionRepo,
    mockTemporalClient,
    TEST_API_KEY_USER_ID
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

jest.mock("../../../../storage/repositories/ExecutionRepository", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient)
}));

jest.mock("../../../../services/sse", () => ({
    createSSEHandler: jest.fn().mockReturnValue({
        sendEvent: jest.fn(),
        onDisconnect: jest.fn()
    }),
    sendTerminalEvent: jest.fn()
}));

jest.mock("../../../../services/events/RedisEventBus", () => ({
    redisEventBus: {
        subscribe: jest.fn().mockResolvedValue(undefined),
        unsubscribe: jest.fn().mockResolvedValue(undefined)
    }
}));

describe("v1 Executions Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockApiKey();
    });

    describe("GET /api/v1/executions", () => {
        it("should list executions", async () => {
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [{ id: "wf-1" }]
            });
            mockExecutionRepo.findAll.mockResolvedValue({
                executions: [
                    {
                        id: "exec-1",
                        workflow_id: "wf-1",
                        status: "completed",
                        inputs: {},
                        outputs: { result: "success" },
                        error: null,
                        started_at: new Date(),
                        completed_at: new Date(),
                        created_at: new Date()
                    }
                ]
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/executions"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].id).toBe("exec-1");
        });

        it("should filter by workflow_id", async () => {
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue({ id: "wf-1" });
            mockExecutionRepo.findByWorkflowId.mockResolvedValue({
                executions: [],
                total: 0
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/executions?workflow_id=wf-1"
            });

            expect(response.statusCode).toBe(200);
            expect(mockExecutionRepo.findByWorkflowId).toHaveBeenCalledWith(
                "wf-1",
                expect.any(Object)
            );
        });
    });

    describe("GET /api/v1/executions/:id", () => {
        it("should get execution by ID", async () => {
            const mockExecution = {
                id: "exec-1",
                workflow_id: "wf-1",
                status: "completed",
                inputs: { name: "test" },
                outputs: { result: "success" },
                error: null,
                started_at: new Date(),
                completed_at: new Date(),
                created_at: new Date()
            };

            mockExecutionRepo.findById.mockResolvedValue(mockExecution);
            mockWorkflowRepo.findById.mockResolvedValue({
                id: "wf-1",
                user_id: TEST_API_KEY_USER_ID
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/executions/exec-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.id).toBe("exec-1");
            expect(body.data.status).toBe("completed");
        });

        it("should return 404 for non-existent execution", async () => {
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/executions/non-existent"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/executions/:id/cancel", () => {
        it("should cancel a running execution", async () => {
            mockExecutionRepo.findById.mockResolvedValue({
                id: "exec-1",
                workflow_id: "wf-1",
                status: "running"
            });
            mockWorkflowRepo.findById.mockResolvedValue({
                id: "wf-1",
                user_id: TEST_API_KEY_USER_ID
            });
            mockExecutionRepo.update.mockResolvedValue(undefined);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/executions/exec-1/cancel"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.status).toBe("cancelled");
        });

        it("should reject cancelling a completed execution", async () => {
            mockExecutionRepo.findById.mockResolvedValue({
                id: "exec-1",
                workflow_id: "wf-1",
                status: "completed"
            });
            mockWorkflowRepo.findById.mockResolvedValue({
                id: "wf-1",
                user_id: TEST_API_KEY_USER_ID
            });

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/executions/exec-1/cancel"
            });

            expect(response.statusCode).toBe(400);
            const body = parseResponse(response);
            expect(body.error.code).toBe("validation_error");
        });

        it("should require executions:cancel scope", async () => {
            const readOnlyKey = createTestApiKey({ scopes: ["executions:read"] });
            mockApiKeyRepo.findByHash.mockResolvedValue(readOnlyKey);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/executions/exec-1/cancel"
            });

            expect(response.statusCode).toBe(403);
        });
    });

    describe("GET /api/v1/executions/:id/events", () => {
        it("should setup SSE stream for execution events", async () => {
            const mockExecution = {
                id: "exec-1",
                workflow_id: "wf-1",
                status: "running"
            };

            mockExecutionRepo.findById.mockResolvedValue(mockExecution);
            mockWorkflowRepo.findById.mockResolvedValue({
                id: "wf-1",
                user_id: TEST_API_KEY_USER_ID
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/executions/exec-1/events"
            });

            // SSE endpoints return 200 and setup stream
            expect(response.statusCode).toBe(200);
        });

        it("should return 404 for non-existent execution", async () => {
            mockExecutionRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/executions/non-existent/events"
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
