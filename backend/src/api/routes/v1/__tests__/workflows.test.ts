/**
 * v1 Workflows Route Tests
 *
 * Tests for workflow CRUD and execution endpoints.
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
    TEST_API_KEY_USER_ID,
    TEST_API_KEY_WORKSPACE_ID
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

jest.mock("@flowmaestro/shared", () => ({
    ...jest.requireActual("@flowmaestro/shared"),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    convertFrontendToBackend: jest.fn().mockImplementation((def, name) => ({ ...def, name })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def)
}));

describe("v1 Workflows Routes", () => {
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

    describe("GET /api/v1/workflows", () => {
        it("should list workflows with pagination", async () => {
            const mockWorkflows = [
                {
                    id: "wf-1",
                    name: "Workflow 1",
                    description: "Test workflow",
                    version: 1,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: "wf-2",
                    name: "Workflow 2",
                    description: null,
                    version: 2,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];

            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: mockWorkflows,
                total: 2
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data).toHaveLength(2);
            expect(body.pagination.total_count).toBe(2);
            expect(body.meta.request_id).toBeDefined();
        });

        it("should support pagination parameters", async () => {
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 50
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows?page=2&per_page=10"
            });

            expect(response.statusCode).toBe(200);
            expect(mockWorkflowRepo.findByWorkspaceId).toHaveBeenCalledWith(
                TEST_API_KEY_WORKSPACE_ID,
                { limit: 10, offset: 10 }
            );
        });
    });

    describe("GET /api/v1/workflows/:id", () => {
        it("should get workflow by ID", async () => {
            const mockWorkflow = {
                id: "wf-1",
                name: "Test Workflow",
                description: "A test workflow",
                version: 1,
                user_id: TEST_API_KEY_USER_ID,
                definition: { nodes: {} },
                created_at: new Date(),
                updated_at: new Date()
            };

            mockWorkflowRepo.findById.mockResolvedValue(mockWorkflow);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows/wf-1"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.data.id).toBe("wf-1");
            expect(body.data.name).toBe("Test Workflow");
        });

        it("should return 404 for non-existent workflow", async () => {
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows/non-existent"
            });

            expect(response.statusCode).toBe(404);
            const body = parseResponse(response);
            expect(body.error.code).toBe("resource_not_found");
        });

        it("should return 404 for workflow owned by different user", async () => {
            mockWorkflowRepo.findById.mockResolvedValue({
                id: "wf-1",
                user_id: "different-user-id"
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows/wf-1"
            });

            expect(response.statusCode).toBe(404);
        });
    });

    describe("POST /api/v1/workflows/:id/execute", () => {
        it("should execute workflow and return execution ID", async () => {
            const mockWorkflow = {
                id: "wf-1",
                name: "Test Workflow",
                user_id: TEST_API_KEY_USER_ID,
                workspace_id: TEST_API_KEY_WORKSPACE_ID,
                definition: {
                    nodes: {
                        input: { type: "input", config: {} },
                        output: { type: "output", config: {} }
                    },
                    edges: []
                }
            };

            mockWorkflowRepo.findById.mockResolvedValue(mockWorkflow);
            mockExecutionRepo.create.mockResolvedValue({
                id: "exec-1",
                workflow_id: "wf-1",
                status: "pending"
            });

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/workflows/wf-1/execute",
                payload: { inputs: { name: "test" } }
            });

            expect(response.statusCode).toBe(202);
            const body = parseResponse(response);
            expect(body.data.execution_id).toBe("exec-1");
            expect(body.data.status).toBe("pending");
        });

        it("should return 404 for non-existent workflow", async () => {
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/workflows/non-existent/execute"
            });

            expect(response.statusCode).toBe(404);
        });

        it("should require workflows:execute scope", async () => {
            const readOnlyKey = createTestApiKey({ scopes: ["workflows:read"] });
            mockApiKeyRepo.findByHash.mockResolvedValue(readOnlyKey);

            const response = await apiKeyRequest(fastify, {
                method: "POST",
                url: "/api/v1/workflows/wf-1/execute"
            });

            expect(response.statusCode).toBe(403);
        });
    });
});
