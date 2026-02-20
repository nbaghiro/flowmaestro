/**
 * Workflow Execution and File Upload Tests
 *
 * Tests for workflow execution, file upload, and multi-tenant isolation.
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

describe("Workflow Execution and Files", () => {
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
    // EXECUTE WORKFLOW
    // ========================================================================
    describe("POST /workflows/execute", () => {
        it("should execute workflow with valid definition", async () => {
            const testUser = createTestUser();
            const workflowDefinition = {
                nodes: [
                    { id: "input", type: "input", position: { x: 0, y: 0 }, data: {} },
                    { id: "output", type: "output", position: { x: 200, y: 0 }, data: {} }
                ],
                edges: [{ id: "e1", source: "input", target: "output" }]
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/execute",
                payload: {
                    workflowDefinition,
                    inputs: { test: "value" }
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ workflowId: string; result: object }>(response);
            expect(body.data.workflowId).toBeDefined();
            expect(body.data.result).toBeDefined();
        });

        it("should return 400 for invalid workflow definition", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/execute",
                payload: {
                    workflowDefinition: {}
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows/execute",
                payload: {
                    workflowDefinition: { nodes: [], edges: [] }
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // FILE UPLOAD
    // ========================================================================
    describe("POST /workflows/files/upload", () => {
        it("should reject non-multipart requests", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/files/upload",
                payload: {}
            });

            expectStatus(response, 406);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows/files/upload",
                payload: {}
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION TESTS
    // ========================================================================
    describe("Multi-tenant Isolation", () => {
        it("workflows are filtered by workspace ID", async () => {
            const userA = createTestUser({ id: uuidv4(), email: "usera@example.com" });

            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({ workflows: [], total: 0 });

            await authenticatedRequest(fastify, userA, {
                method: "GET",
                url: "/workflows"
            });

            expect(mockWorkflowRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("workflows created are assigned to authenticated user and workspace", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.create.mockImplementation((data) =>
                Promise.resolve(createMockWorkflow(data))
            );

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows",
                payload: {
                    name: "Test Workflow",
                    definition: createSimpleWorkflowDefinition()
                }
            });

            expect(mockWorkflowRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: testUser.id,
                    workspace_id: DEFAULT_TEST_WORKSPACE_ID
                })
            );
        });
    });
});
