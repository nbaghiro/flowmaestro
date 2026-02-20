/**
 * Workflow CRUD Operations Tests
 *
 * Tests for workflow list, create, get, update, and delete operations.
 */

import { FastifyInstance } from "fastify";
import {
    mockWorkflowRepo,
    mockUserRepo,
    createMockWorkflow,
    resetAllMocks,
    createWorkflowTestServer,
    closeWorkflowTestServer,
    createTestUser,
    authenticatedRequest,
    unauthenticatedRequest,
    createSimpleWorkflowDefinition,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    uuidv4,
    DEFAULT_TEST_WORKSPACE_ID
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

jest.mock("../../../../storage/repositories", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo),
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue({
        workflow: {
            start: jest.fn().mockResolvedValue({
                result: jest
                    .fn()
                    .mockResolvedValue({ status: "completed", output: { result: "success" } })
            }),
            getHandle: jest.fn().mockReturnValue({
                result: jest
                    .fn()
                    .mockResolvedValue({ status: "completed", output: { result: "success" } })
            })
        }
    }),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("@flowmaestro/shared", () => ({
    ...jest.requireActual("@flowmaestro/shared"),
    convertFrontendToBackend: jest.fn().mockImplementation((def) => ({
        name: def.name || "Converted Workflow",
        nodes: def.nodes || {},
        edges: def.edges || [],
        entryPoint: "input"
    })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] })
}));

jest.mock("../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn().mockImplementation(() => ({
        upload: jest.fn().mockResolvedValue("gs://test-bucket/test.pdf"),
        getMetadata: jest.fn().mockResolvedValue({ size: 1024 })
    }))
}));

jest.mock("../../../../services/WorkflowGenerator", () => ({
    generateWorkflow: jest.fn().mockResolvedValue({
        nodes: [],
        edges: [],
        metadata: { name: "Generated Workflow", entryNodeId: "input", description: "AI-generated" }
    })
}));

jest.mock("../../../../services/WorkflowGenerationChatService", () => ({
    WorkflowGenerationChatService: jest.fn().mockImplementation(() => ({
        processMessage: jest.fn().mockResolvedValue({ content: "Response", workflowPlan: null }),
        createWorkflowFromPlan: jest
            .fn()
            .mockResolvedValue({ id: "new-workflow-id", name: "Created" })
    }))
}));

jest.mock("../../../../services/WorkflowChatService", () => ({
    WorkflowChatService: jest.fn().mockImplementation(() => ({
        processChat: jest.fn().mockResolvedValue({ response: "Chat response", changes: [] })
    }))
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Workflow CRUD Operations", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createWorkflowTestServer();
    });

    afterAll(async () => {
        await closeWorkflowTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
    });

    // ========================================================================
    // LIST WORKFLOWS
    // ========================================================================
    describe("GET /workflows", () => {
        it("should list workflows for authenticated user", async () => {
            const testUser = createTestUser();
            const workflows = [
                createMockWorkflow({ user_id: testUser.id, name: "Workflow 1" }),
                createMockWorkflow({ user_id: testUser.id, name: "Workflow 2" })
            ];
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                items: object[];
                total: number;
                page: number;
                pageSize: number;
                hasMore: boolean;
            }>(response);
            expect(body.data.items).toHaveLength(2);
            expect(body.data.total).toBe(2);
        });

        it("should return empty list for new user", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 0
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ items: object[]; total: number }>(response);
            expect(body.data.items).toHaveLength(0);
            expect(body.data.total).toBe(0);
        });

        it("should respect limit and offset parameters", async () => {
            const testUser = createTestUser();
            const workflows = [createMockWorkflow({ user_id: testUser.id, name: "Workflow 3" })];
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows,
                total: 10
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows",
                query: { limit: "1", offset: "2" }
            });

            expectStatus(response, 200);
            expect(mockWorkflowRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ limit: 1, offset: 2 })
            );
        });

        it("should filter by folderId", async () => {
            const testUser = createTestUser();
            const folderId = uuidv4();
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows",
                query: { folderId }
            });

            expect(mockWorkflowRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ folderId })
            );
        });

        it("should filter root-level workflows with folderId=null", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows",
                query: { folderId: "null" }
            });

            expect(mockWorkflowRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ folderId: null })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/workflows"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // CREATE WORKFLOW
    // ========================================================================
    describe("POST /workflows", () => {
        it("should create a workflow with valid data", async () => {
            const testUser = createTestUser();
            const workflowData = {
                name: "New Workflow",
                description: "A brand new workflow",
                definition: createSimpleWorkflowDefinition("New Workflow")
            };

            const createdWorkflow = createMockWorkflow({
                user_id: testUser.id,
                ...workflowData
            });
            mockWorkflowRepo.create.mockResolvedValue(createdWorkflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows",
                payload: workflowData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("New Workflow");
        });

        it("should create AI-generated workflow with aiGenerated flag", async () => {
            const testUser = createTestUser();
            const workflowData = {
                name: "AI Workflow",
                definition: createSimpleWorkflowDefinition("AI Workflow"),
                aiGenerated: true,
                aiPrompt: "Create a workflow that processes user data"
            };

            const createdWorkflow = createMockWorkflow({
                user_id: testUser.id,
                name: workflowData.name,
                ai_generated: true,
                ai_prompt: workflowData.aiPrompt
            });
            mockWorkflowRepo.create.mockResolvedValue(createdWorkflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows",
                payload: workflowData
            });

            expectStatus(response, 201);
            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ai_generated: true,
                    ai_prompt: "Create a workflow that processes user data"
                })
            );
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows",
                payload: {
                    description: "Only description"
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows",
                payload: {
                    name: "Test",
                    definition: createSimpleWorkflowDefinition()
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET WORKFLOW BY ID
    // ========================================================================
    describe("GET /workflows/:id", () => {
        it("should return workflow for owner", async () => {
            const testUser = createTestUser();
            const workflow = createMockWorkflow({
                id: uuidv4(),
                user_id: testUser.id,
                name: "My Workflow"
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workflows/${workflow.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("My Workflow");
        });

        it("should return 404 for non-existent workflow", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workflows/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other workspace's workflow (multi-tenant isolation)", async () => {
            const testUser = createTestUser();
            const otherWorkspaceId = uuidv4();
            const workflow = createMockWorkflow({
                id: uuidv4(),
                workspace_id: otherWorkspaceId,
                name: "Other Workspace's Workflow"
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workflows/${workflow.id}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/workflows/${uuidv4()}`
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // UPDATE WORKFLOW
    // ========================================================================
    describe("PUT /workflows/:id", () => {
        it("should update workflow for owner", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const existingWorkflow = createMockWorkflow({
                id: workflowId,
                user_id: testUser.id,
                name: "Old Name"
            });
            mockWorkflowRepo.findById.mockResolvedValue(existingWorkflow);
            mockWorkflowRepo.update.mockResolvedValue({
                ...existingWorkflow,
                name: "New Name"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workflows/${workflowId}`,
                payload: { name: "New Name" }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("New Name");
        });

        it("should update workflow definition", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const existingWorkflow = createMockWorkflow({
                id: workflowId,
                user_id: testUser.id
            });
            const newDefinition = createSimpleWorkflowDefinition("Updated Workflow");

            mockWorkflowRepo.findById.mockResolvedValue(existingWorkflow);
            mockWorkflowRepo.update.mockResolvedValue({
                ...existingWorkflow,
                definition: newDefinition
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workflows/${workflowId}`,
                payload: { definition: newDefinition }
            });

            expectStatus(response, 200);
            expect(mockWorkflowRepo.update).toHaveBeenCalledWith(
                workflowId,
                expect.objectContaining({ definition: newDefinition })
            );
        });

        it("should return 404 for non-existent workflow", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workflows/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other workspace's workflow (multi-tenant isolation)", async () => {
            const testUser = createTestUser();
            const otherWorkspaceId = uuidv4();
            const workflowId = uuidv4();
            const workflow = createMockWorkflow({
                id: workflowId,
                workspace_id: otherWorkspaceId
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/workflows/${workflowId}`,
                payload: { name: "Hacked Name" }
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // DELETE WORKFLOW
    // ========================================================================
    describe("DELETE /workflows/:id", () => {
        it("should soft delete workflow for owner", async () => {
            const testUser = createTestUser();
            const workflowId = uuidv4();
            const workflow = createMockWorkflow({
                id: workflowId,
                user_id: testUser.id
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workflows/${workflowId}`
            });

            expectStatus(response, 204);
            expect(mockWorkflowRepo.delete).toHaveBeenCalledWith(workflowId);
        });

        it("should return 404 for non-existent workflow", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workflows/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for other workspace's workflow (multi-tenant isolation)", async () => {
            const testUser = createTestUser();
            const otherWorkspaceId = uuidv4();
            const workflowId = uuidv4();
            const workflow = createMockWorkflow({
                id: workflowId,
                workspace_id: otherWorkspaceId
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/workflows/${workflowId}`
            });

            expectErrorResponse(response, 404);
            expect(mockWorkflowRepo.delete).not.toHaveBeenCalled();
        });
    });
});
