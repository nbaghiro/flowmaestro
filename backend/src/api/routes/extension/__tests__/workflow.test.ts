/**
 * Extension Workflow Execution Route Tests
 *
 * Tests for workflow execution from the browser extension.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    authenticatedRequest,
    unauthenticatedRequest,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    mockWorkflowRepo,
    mockExecutionRepo,
    mockTemporalClient,
    createExtensionTestServer,
    setupDefaultMocks,
    closeTestServer
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/WorkspaceRepository", () => ({
    WorkspaceRepository: jest.fn().mockImplementation(() => mockWorkspaceRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceMemberRepository", () => ({
    WorkspaceMemberRepository: jest.fn().mockImplementation(() => mockWorkspaceMemberRepo)
}));

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
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] })
}));

describe("Extension Workflow Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createExtensionTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupDefaultMocks();
        mockTemporalClient.workflow.start.mockResolvedValue({ workflowId: "test-workflow-id" });
    });

    describe("POST /extension/execute-workflow", () => {
        const validPayload = {
            workflowId: uuidv4(),
            pageContext: {
                url: "https://example.com",
                title: "Example Page",
                text: "Page content"
            },
            inputMappings: [{ nodeId: "input1", source: "text" }]
        };

        it("should execute workflow with valid payload", async () => {
            const testUser = createTestUser();
            const workflowId = validPayload.workflowId;

            mockWorkflowRepo.findById.mockResolvedValue({
                id: workflowId,
                workspace_id: "test-workspace-id",
                name: "Test Workflow",
                definition: { nodes: {}, edges: [] }
            });
            mockExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                workflow_id: workflowId,
                status: "pending"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ executionId: string; status: string }>(response);
            expect(body.data.executionId).toBeDefined();
            expect(body.data.status).toBe("pending");
        });

        it("should return 400 for missing workflowId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: {
                    pageContext: validPayload.pageContext,
                    inputMappings: []
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing pageContext", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: {
                    workflowId: validPayload.workflowId,
                    inputMappings: []
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 404 for non-existent workflow", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for workflow in different workspace", async () => {
            const testUser = createTestUser();

            mockWorkflowRepo.findById.mockResolvedValue({
                id: validPayload.workflowId,
                workspace_id: "other-workspace-id",
                name: "Test Workflow"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid workflow definition", async () => {
            const testUser = createTestUser();
            const shared = jest.requireMock("@flowmaestro/shared") as {
                validateWorkflowForExecution: jest.Mock;
            };
            shared.validateWorkflowForExecution.mockReturnValueOnce({
                isValid: false,
                errors: ["Missing input node"]
            });

            mockWorkflowRepo.findById.mockResolvedValue({
                id: validPayload.workflowId,
                workspace_id: "test-workspace-id",
                name: "Test Workflow",
                definition: { nodes: {} }
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 400);
        });

        it("should return 500 when Temporal client fails", async () => {
            const testUser = createTestUser();

            mockWorkflowRepo.findById.mockResolvedValue({
                id: validPayload.workflowId,
                workspace_id: "test-workspace-id",
                name: "Test Workflow",
                definition: { nodes: {}, edges: [] }
            });
            mockExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                workflow_id: validPayload.workflowId,
                status: "pending"
            });
            mockTemporalClient.workflow.start.mockRejectedValueOnce(
                new Error("Temporal unavailable")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 500);
            expect(mockExecutionRepo.update).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ status: "failed" })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 401);
        });
    });
});
