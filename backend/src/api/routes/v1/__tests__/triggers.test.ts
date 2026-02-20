/**
 * v1 Triggers Route Tests
 *
 * Tests for trigger list and execute endpoints.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    parseResponse,
    mockWorkflowRepo,
    mockTriggerRepo,
    mockExecutionRepo,
    mockTemporalClient
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
}));

jest.mock("../../../../storage/repositories/ExecutionRepository", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient)
}));

jest.mock("@flowmaestro/shared", () => ({
    ...jest.requireActual("@flowmaestro/shared"),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    convertFrontendToBackend: jest.fn().mockImplementation((def, name) => ({ ...def, name })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def)
}));

describe("v1 Triggers Routes", () => {
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

    describe("GET /api/v1/triggers", () => {
        it("should list triggers", async () => {
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [{ id: "wf-1" }]
            });
            mockTriggerRepo.findByWorkflowId.mockResolvedValue([
                {
                    id: "trigger-1",
                    workflow_id: "wf-1",
                    name: "Test Trigger",
                    trigger_type: "webhook",
                    enabled: true,
                    last_triggered_at: null,
                    trigger_count: 0,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/triggers"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(1);
            expect(body.data[0].name).toBe("Test Trigger");
        });
    });

    describe("POST /api/v1/triggers/:id/execute", () => {
        it("should execute trigger", async () => {
            mockTriggerRepo.findById.mockResolvedValue({
                id: "trigger-1",
                workflow_id: "wf-1",
                enabled: true
            });
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "wf-1",
                name: "Test Workflow",
                definition: { nodes: {}, edges: [] }
            });
            mockExecutionRepo.create.mockResolvedValue({
                id: "exec-1"
            });
            mockTriggerRepo.createExecution.mockResolvedValue(undefined);
            mockTriggerRepo.recordTrigger.mockResolvedValue(undefined);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/triggers/trigger-1/execute",
                payload: { inputs: { key: "value" } }
            });

            expect(response.statusCode).toBe(202);
            const body = parseResponse(response);
            expect(body.data.execution_id).toBe("exec-1");
        });

        it("should reject disabled trigger", async () => {
            mockTriggerRepo.findById.mockResolvedValue({
                id: "trigger-1",
                workflow_id: "wf-1",
                enabled: false
            });
            mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: "wf-1"
            });

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/triggers/trigger-1/execute"
            });

            expect(response.statusCode).toBe(400);
            const body = parseResponse(response);
            expect(body.error.message).toContain("not enabled");
        });

        it("should return 404 for non-existent trigger", async () => {
            mockTriggerRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/triggers/non-existent/execute"
            });

            expect(response.statusCode).toBe(404);
        });
    });
});
