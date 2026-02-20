/**
 * Workflow AI Features Tests
 *
 * Tests for AI-powered workflow generation, chat, and system workflows.
 */

import { FastifyInstance } from "fastify";
import { generateWorkflow } from "../../../../services/WorkflowGenerator";
import {
    mockWorkflowRepo,
    mockUserRepo,
    mockGeneratedWorkflow,
    mockGenerationChatService,
    createMockWorkflow,
    resetAllMocks,
    createWorkflowTestServer,
    closeWorkflowTestServer,
    createTestUser,
    authenticatedRequest,
    authenticatedAdminRequest,
    unauthenticatedRequest,
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
        metadata: {
            name: "Generated Workflow",
            entryNodeId: "input",
            description: "AI-generated workflow"
        }
    })
}));

jest.mock("../../../../services/WorkflowGenerationChatService", () => ({
    WorkflowGenerationChatService: jest.fn().mockImplementation(() => mockGenerationChatService)
}));

jest.mock("../../../../services/WorkflowChatService", () => ({
    WorkflowChatService: jest.fn().mockImplementation(() => ({
        processChat: jest.fn().mockResolvedValue({ response: "Chat response", changes: [] })
    }))
}));

// Cast mock after imports
const mockGenerateWorkflow = generateWorkflow as jest.MockedFunction<typeof generateWorkflow>;

// ============================================================================
// TESTS
// ============================================================================

describe("Workflow AI Features", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createWorkflowTestServer();
    });

    afterAll(async () => {
        await closeWorkflowTestServer(fastify);
    });

    beforeEach(() => {
        resetAllMocks();
        mockGenerateWorkflow.mockResolvedValue(mockGeneratedWorkflow);
    });

    // ========================================================================
    // GENERATE WORKFLOW
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
            const body = expectSuccessResponse<{ metadata: { name: string } }>(response);
            expect(body.data.metadata.name).toBe("Generated Workflow");
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
                    prompt: "short",
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

    // ========================================================================
    // GENERATION CHAT
    // ========================================================================
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

    // ========================================================================
    // CREATE FROM PLAN
    // ========================================================================
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

    // ========================================================================
    // WORKFLOW CHAT
    // ========================================================================
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
                    message: "x".repeat(5001),
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

    // ========================================================================
    // SYSTEM WORKFLOWS
    // ========================================================================
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
