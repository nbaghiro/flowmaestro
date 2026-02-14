/**
 * Workflow Routes Integration Tests
 *
 * Tests for workflow management endpoints including:
 * - CRUD operations (list, create, get, update, delete)
 * - Multi-tenant isolation
 * - Pagination
 * - Workflow execution
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock workflow repository
const mockWorkflowRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findById: jest.fn(),
    findBySystemKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

// Mock UserRepository for admin middleware
const mockUserRepo = {
    findById: jest.fn(),
    findByEmail: jest.fn()
};

jest.mock("../../../../storage/repositories", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo),
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

// Also mock the UserRepository import used by admin middleware
jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

// Mock Temporal client (already mocked in fastify-test-client)
const mockTemporalWorkflowHandle = {
    result: jest.fn().mockResolvedValue({ status: "completed", output: { result: "success" } })
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalWorkflowHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalWorkflowHandle)
    }
};

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

// Mock workflow converter
jest.mock("../../../../core/utils/workflow-converter", () => ({
    convertFrontendToBackend: jest.fn().mockImplementation((def) => ({
        name: def.name || "Converted Workflow",
        nodes: def.nodes || {},
        edges: def.edges || [],
        entryPoint: "input"
    })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    FrontendWorkflowDefinition: {}
}));

// Mock GCS storage service for file uploads
const mockGCSService = {
    upload: jest.fn().mockResolvedValue("gs://test-bucket/workflow-files/test.pdf"),
    getMetadata: jest.fn().mockResolvedValue({ size: 1024 }),
    getPublicUrl: jest.fn().mockReturnValue("https://storage.googleapis.com/test-bucket/test.pdf")
};

jest.mock("../../../../services/GCSStorageService", () => ({
    getUploadsStorageService: jest.fn().mockImplementation(() => mockGCSService)
}));

// Mock workflow generator service
const mockGeneratedWorkflow = {
    name: "Generated Workflow",
    description: "AI-generated workflow",
    nodes: {},
    edges: [],
    entryPoint: "input"
};

jest.mock("../../../../services/WorkflowGenerator", () => ({
    generateWorkflow: jest.fn().mockResolvedValue(mockGeneratedWorkflow)
}));

// Import after mock for access
import { generateWorkflow } from "../../../../services/WorkflowGenerator";
const mockGenerateWorkflow = generateWorkflow as jest.MockedFunction<typeof generateWorkflow>;

// Mock WorkflowGenerationChatService
const mockGenerationChatService = {
    processMessage: jest.fn().mockResolvedValue({
        content: "Generated response",
        workflowPlan: null
    }),
    createWorkflowFromPlan: jest.fn().mockResolvedValue({
        id: "new-workflow-id",
        name: "Created Workflow"
    })
};

jest.mock("../../../../services/WorkflowGenerationChatService", () => ({
    WorkflowGenerationChatService: jest.fn().mockImplementation(() => mockGenerationChatService)
}));

// Mock WorkflowChatService
const mockChatService = {
    processChat: jest.fn().mockResolvedValue({
        response: "Chat response",
        changes: []
    })
};

jest.mock("../../../../services/WorkflowChatService", () => ({
    WorkflowChatService: jest.fn().mockImplementation(() => mockChatService)
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    createTestWorkflowDefinition,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockWorkflow(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        description: string;
        definition: object;
        ai_generated: boolean;
        ai_prompt: string | null;
        folder_id: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Workflow",
        description: overrides.description || "A test workflow",
        definition: overrides.definition || createTestWorkflowDefinition(),
        ai_generated: overrides.ai_generated ?? false,
        ai_prompt: overrides.ai_prompt ?? null,
        folder_id: overrides.folder_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset default behaviors
    mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({ workflows: [], total: 0 });
    mockWorkflowRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockWorkflowRepo.findById.mockResolvedValue(null);
    mockWorkflowRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockWorkflow({ ...data, id: uuidv4() }))
    );
    mockWorkflowRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockWorkflow({ id, ...data }))
    );
    mockWorkflowRepo.delete.mockResolvedValue(true);

    // Reset GCS mock
    mockGCSService.upload.mockResolvedValue("gs://test-bucket/workflow-files/test.pdf");
    mockGCSService.getMetadata.mockResolvedValue({ size: 1024 });

    // Reset AI service mocks
    mockGenerateWorkflow.mockResolvedValue(mockGeneratedWorkflow);
    mockGenerationChatService.processMessage.mockResolvedValue({
        content: "Generated response",
        workflowPlan: null
    });
    mockGenerationChatService.createWorkflowFromPlan.mockResolvedValue({
        id: "new-workflow-id",
        name: "Created Workflow"
    });
    mockChatService.processChat.mockResolvedValue({
        response: "Chat response",
        changes: []
    });

    // Reset user repo mock (for admin middleware)
    mockUserRepo.findById.mockResolvedValue(null);
    mockWorkflowRepo.findBySystemKey.mockResolvedValue(null);
}

/**
 * Helper to make an admin user request.
 * Sets up the UserRepository mock to return an admin user.
 */
async function authenticatedAdminRequest(
    fastify: FastifyInstance,
    user: ReturnType<typeof createTestUser>,
    options: Parameters<typeof authenticatedRequest>[2]
) {
    // Set up admin user in mock repo
    mockUserRepo.findById.mockResolvedValue({
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: true,
        created_at: new Date(),
        updated_at: new Date()
    });

    return authenticatedRequest(fastify, user, options);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Workflow Routes", () => {
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
                definition: createTestWorkflowDefinition("New Workflow")
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
                definition: createTestWorkflowDefinition("AI Workflow"),
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
                    // Missing name and definition
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
                    definition: createTestWorkflowDefinition()
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
                workspace_id: otherWorkspaceId, // Different workspace
                name: "Other Workspace's Workflow"
            });
            mockWorkflowRepo.findById.mockResolvedValue(workflow);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/workflows/${workflow.id}`
            });

            // Should return 404, not 403, to not reveal workflow existence
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
            const newDefinition = createTestWorkflowDefinition("Updated Workflow");

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
                // workspace_id defaults to DEFAULT_TEST_WORKSPACE_ID
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
            // Verify delete was NOT called
            expect(mockWorkflowRepo.delete).not.toHaveBeenCalled();
        });
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
                    workflowDefinition: {} // Missing nodes
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

            // Send non-multipart request - endpoint expects multipart/form-data
            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/files/upload",
                payload: {}
            });

            // Without multipart data, returns 406 Not Acceptable
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

        // Note: Full multipart file upload tests require integration testing
        // with actual file streams. The handler validates:
        // - File extension against SupportedFileTypes (pdf, docx, xlsx, csv, txt, json, md, html)
        // - Uploads to GCS via getUploadsStorageService
        // - Returns array of { fileName, fileType, gcsUri, fileSize }
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

            // Verify the query was filtered by workspace ID
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
                    definition: createTestWorkflowDefinition()
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

    // ========================================================================
    // AI FEATURES - PHASE 4
    // ========================================================================

    describe("POST /workflows/generate", () => {
        it("should generate workflow from prompt", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generate",
                payload: {
                    prompt: "Create a workflow that sends an email when a form is submitted",
                    connectionId
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("Generated Workflow");
            expect(mockGenerateWorkflow).toHaveBeenCalledWith({
                userPrompt: "Create a workflow that sends an email when a form is submitted",
                connectionId,
                userId: testUser.id
            });
        });

        it("should return 400 for prompt too short", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generate",
                payload: {
                    prompt: "short", // Less than 10 characters
                    connectionId: uuidv4()
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for invalid connectionId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generate",
                payload: {
                    prompt: "Create a workflow that processes data",
                    connectionId: "not-a-uuid"
                }
            });

            expectStatus(response, 400);
        });

        it("should return 500 when generation fails", async () => {
            const testUser = createTestUser();
            mockGenerateWorkflow.mockRejectedValueOnce(new Error("AI service unavailable"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generate",
                payload: {
                    prompt: "Create a workflow that processes user data",
                    connectionId: uuidv4()
                }
            });

            expectStatus(response, 500);
            const body = response.json<{ success: boolean; error: { code: string } }>();
            expect(body.error.code).toBe("WORKFLOW_GENERATION_FAILED");
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows/generate",
                payload: {
                    prompt: "Create a workflow",
                    connectionId: uuidv4()
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    describe("POST /workflows/generation/chat", () => {
        it("should initiate generation chat and return execution ID", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generation/chat",
                payload: {
                    message: "Help me create a workflow for invoice processing",
                    conversationHistory: [],
                    connectionId,
                    model: "claude-3-sonnet",
                    enableThinking: false
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ executionId: string; messageId: string }>(
                response
            );
            expect(body.data.executionId).toBeDefined();
            expect(body.data.messageId).toBeDefined();
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generation/chat",
                payload: {
                    message: "Help me create a workflow"
                    // Missing connectionId and model
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for invalid connectionId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generation/chat",
                payload: {
                    message: "Help me create a workflow",
                    connectionId: "not-a-uuid",
                    model: "claude-3-sonnet"
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows/generation/chat",
                payload: {
                    message: "Help me create a workflow",
                    connectionId: uuidv4(),
                    model: "claude-3-sonnet"
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    describe("POST /workflows/generation/create", () => {
        it("should create workflow from approved plan", async () => {
            const testUser = createTestUser();
            const plan = {
                name: "Invoice Processing Workflow",
                description: "Processes incoming invoices",
                summary: "A workflow that processes invoices",
                entryNodeId: "start",
                nodes: [{ id: "start", type: "input", position: { x: 0, y: 0 } }],
                edges: []
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generation/create",
                payload: { plan }
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.id).toBe("new-workflow-id");
            expect(mockGenerationChatService.createWorkflowFromPlan).toHaveBeenCalledWith(
                plan,
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                undefined
            );
        });

        it("should create workflow with folderId", async () => {
            const testUser = createTestUser();
            const folderId = uuidv4();
            const plan = {
                name: "Test Workflow",
                description: "Test description",
                summary: "Test summary",
                entryNodeId: "start",
                nodes: [],
                edges: []
            };

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generation/create",
                payload: { plan, folderId }
            });

            expect(mockGenerationChatService.createWorkflowFromPlan).toHaveBeenCalledWith(
                plan,
                testUser.id,
                DEFAULT_TEST_WORKSPACE_ID,
                folderId
            );
        });

        it("should return 400 for missing plan name", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/generation/create",
                payload: {
                    plan: {
                        description: "Missing name",
                        summary: "Test",
                        entryNodeId: "start",
                        nodes: [],
                        edges: []
                    }
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows/generation/create",
                payload: {
                    plan: {
                        name: "Test",
                        description: "Test",
                        summary: "Test",
                        entryNodeId: "start",
                        nodes: [],
                        edges: []
                    }
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    describe("POST /workflows/chat", () => {
        it("should initiate workflow chat and return execution ID", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/chat",
                payload: {
                    message: "Add a condition node after the input",
                    action: "add",
                    context: {
                        nodes: [{ id: "input", type: "input" }],
                        edges: []
                    },
                    connectionId,
                    model: "claude-3-sonnet"
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ executionId: string }>(response);
            expect(body.data.executionId).toBeDefined();
        });

        it("should work with null action for conversational mode", async () => {
            const testUser = createTestUser();
            const connectionId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/chat",
                payload: {
                    message: "What does this workflow do?",
                    action: null,
                    context: {
                        nodes: [{ id: "input", type: "input" }],
                        edges: []
                    },
                    connectionId
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ executionId: string }>(response);
            expect(body.data.executionId).toBeDefined();
        });

        it("should return 400 for missing context", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/chat",
                payload: {
                    message: "Add a node",
                    action: "add",
                    connectionId: uuidv4()
                    // Missing context
                }
            });

            expectStatus(response, 400);
        });

        it("should return 400 for message too long", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/workflows/chat",
                payload: {
                    message: "x".repeat(5001), // Max 5000 characters
                    action: null,
                    context: { nodes: [], edges: [] },
                    connectionId: uuidv4()
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/workflows/chat",
                payload: {
                    message: "Add a node",
                    context: { nodes: [], edges: [] },
                    connectionId: uuidv4()
                }
            });

            expectErrorResponse(response, 401);
        });
    });

    describe("GET /workflows/system/:key", () => {
        it("should return system workflow for admin user", async () => {
            const testUser = createTestUser();
            const systemWorkflow = createMockWorkflow({
                name: "System Email Template"
            });
            mockWorkflowRepo.findBySystemKey.mockResolvedValue(systemWorkflow);

            const response = await authenticatedAdminRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows/system/email-template"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("System Email Template");
            expect(mockWorkflowRepo.findBySystemKey).toHaveBeenCalledWith("email-template");
        });

        it("should return 404 for non-existent system key", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findBySystemKey.mockResolvedValue(null);

            const response = await authenticatedAdminRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows/system/non-existent-key"
            });

            expectErrorResponse(response, 404);
        });

        it("should return 403 for non-admin user", async () => {
            const testUser = createTestUser();
            // Set up non-admin user
            mockUserRepo.findById.mockResolvedValue({
                id: testUser.id,
                email: testUser.email,
                is_admin: false,
                created_at: new Date(),
                updated_at: new Date()
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/workflows/system/email-template"
            });

            expectErrorResponse(response, 403);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/workflows/system/email-template"
            });

            expectErrorResponse(response, 401);
        });
    });
});
