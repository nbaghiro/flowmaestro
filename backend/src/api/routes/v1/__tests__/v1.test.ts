/**
 * Public API v1 Route Tests
 *
 * Tests for all v1 public API endpoints using API key authentication.
 */

import { FastifyInstance } from "fastify";
import {
    createTestServer,
    closeTestServer,
    apiKeyRequest,
    setupMockApiKey,
    createTestApiKey,
    mockApiKeyRepo,
    TEST_API_KEY_USER_ID,
    TEST_API_KEY_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// Type helper for API responses - using Record for test flexibility
interface V1ApiResponse {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>;
    error: { code: string; message: string };
    meta: { request_id: string; timestamp: string };
    pagination: {
        total: number;
        total_count: number;
        total_pages: number;
        page: number;
        per_page: number;
        pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

function parseResponse(response: { json: () => unknown }): V1ApiResponse {
    return response.json() as V1ApiResponse;
}

// Mock repositories used by v1 routes
const mockWorkflowRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

const mockExecutionRepo = {
    findById: jest.fn(),
    findByWorkflowId: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

const mockAgentRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

const mockThreadRepo = {
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

const mockAgentExecutionRepo = {
    findById: jest.fn(),
    getMessagesByThread: jest.fn(),
    getMessages: jest.fn(),
    create: jest.fn()
};

const mockTriggerRepo = {
    findById: jest.fn(),
    findByWorkflowId: jest.fn(),
    createExecution: jest.fn(),
    recordTrigger: jest.fn()
};

const mockKnowledgeBaseRepo = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    getStats: jest.fn()
};

const mockKnowledgeChunkRepo = {
    searchSimilar: jest.fn()
};

const mockOutgoingWebhookRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    create: jest.fn(),
    updateByWorkspace: jest.fn(),
    deleteByWorkspace: jest.fn()
};

const mockWebhookDeliveryRepo = {
    findByWebhookId: jest.fn()
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" }),
        getHandle: jest.fn().mockReturnValue({
            cancel: jest.fn().mockResolvedValue(undefined)
        })
    }
};

const mockEmbeddingService = {
    generateEmbeddings: jest.fn()
};

// Setup mocks
jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

jest.mock("../../../../storage/repositories/ExecutionRepository", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
}));

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
}));

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
}));

jest.mock("../../../../storage/repositories/TriggerRepository", () => ({
    TriggerRepository: jest.fn().mockImplementation(() => mockTriggerRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeBaseRepository", () => ({
    KnowledgeBaseRepository: jest.fn().mockImplementation(() => mockKnowledgeBaseRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeChunkRepository", () => ({
    KnowledgeChunkRepository: jest.fn().mockImplementation(() => mockKnowledgeChunkRepo)
}));

jest.mock("../../../../storage/repositories/OutgoingWebhookRepository", () => ({
    OutgoingWebhookRepository: jest.fn().mockImplementation(() => mockOutgoingWebhookRepo),
    WebhookDeliveryRepository: jest.fn().mockImplementation(() => mockWebhookDeliveryRepo)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient)
}));

jest.mock("../../../../services/embeddings/EmbeddingService", () => ({
    EmbeddingService: jest.fn().mockImplementation(() => mockEmbeddingService)
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

jest.mock("../../../../storage/models/OutgoingWebhook", () => ({
    WEBHOOK_EVENT_TYPES: [
        "workflow.started",
        "workflow.completed",
        "workflow.failed",
        "execution.started",
        "execution.completed",
        "execution.failed"
    ]
}));

jest.mock("../../../../core/utils/workflow-converter", () => ({
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
    convertFrontendToBackend: jest.fn().mockImplementation((def, name) => ({ ...def, name })),
    stripNonExecutableNodes: jest.fn().mockImplementation((def) => def)
}));

describe("Public API v1 Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default API key for all tests
        setupMockApiKey();
    });

    // =========================================================================
    // AUTHENTICATION TESTS
    // =========================================================================

    describe("API Key Authentication", () => {
        it("should reject requests without API key", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.payload);
            expect(body.error.code).toBe("invalid_api_key");
        });

        it("should reject requests with invalid API key format", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/api/v1/workflows",
                headers: { "X-API-Key": "invalid-key" }
            });

            expect(response.statusCode).toBe(401);
            const body = JSON.parse(response.payload);
            expect(body.error.code).toBe("invalid_api_key");
        });

        it("should reject requests with revoked API key", async () => {
            const revokedKey = createTestApiKey({ revoked_at: new Date() });
            mockApiKeyRepo.findByHash.mockResolvedValue(revokedKey);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(401);
            const body = parseResponse(response);
            expect(body.error.code).toBe("revoked_api_key");
        });

        it("should reject requests with expired API key", async () => {
            const expiredKey = createTestApiKey({
                expires_at: new Date(Date.now() - 86400000)
            });
            mockApiKeyRepo.findByHash.mockResolvedValue(expiredKey);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(401);
            const body = parseResponse(response);
            expect(body.error.code).toBe("expired_api_key");
        });

        it("should reject requests with inactive API key", async () => {
            const inactiveKey = createTestApiKey({ is_active: false });
            mockApiKeyRepo.findByHash.mockResolvedValue(inactiveKey);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(401);
        });

        it("should reject requests with insufficient scopes", async () => {
            const limitedKey = createTestApiKey({ scopes: [] });
            mockApiKeyRepo.findByHash.mockResolvedValue(limitedKey);

            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 0
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(403);
            const body = parseResponse(response);
            expect(body.error.code).toBe("insufficient_scope");
        });

        it("should accept requests with valid API key via Bearer header", async () => {
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 0
            });

            const response = await fastify.inject({
                method: "GET",
                url: "/api/v1/workflows",
                headers: { Authorization: "Bearer fm_live_test_api_key" }
            });

            expect(response.statusCode).toBe(200);
        });
    });

    // =========================================================================
    // WORKFLOWS ROUTES
    // =========================================================================

    describe("Workflows", () => {
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

    // =========================================================================
    // EXECUTIONS ROUTES
    // =========================================================================

    describe("Executions", () => {
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

    // =========================================================================
    // AGENTS ROUTES
    // =========================================================================

    describe("Agents", () => {
        describe("GET /api/v1/agents", () => {
            it("should list agents", async () => {
                mockAgentRepo.findByWorkspaceId.mockResolvedValue({
                    agents: [
                        {
                            id: "agent-1",
                            name: "Test Agent",
                            description: "A test agent",
                            model: "gpt-4",
                            provider: "openai",
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    ],
                    total: 1
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/agents"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data).toHaveLength(1);
                expect(body.data[0].name).toBe("Test Agent");
            });
        });

        describe("GET /api/v1/agents/:id", () => {
            it("should get agent by ID", async () => {
                mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "agent-1",
                    name: "Test Agent",
                    description: "A test agent",
                    model: "gpt-4",
                    provider: "openai",
                    system_prompt: "You are helpful",
                    temperature: 0.7,
                    max_tokens: 1000,
                    available_tools: [],
                    created_at: new Date(),
                    updated_at: new Date()
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/agents/agent-1"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.id).toBe("agent-1");
                expect(body.data.system_prompt).toBe("You are helpful");
            });

            it("should return 404 for non-existent agent", async () => {
                mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/agents/non-existent"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("POST /api/v1/agents/:id/threads", () => {
            it("should create thread for agent", async () => {
                mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "agent-1",
                    name: "Test Agent"
                });
                mockThreadRepo.create.mockResolvedValue({
                    id: "thread-1",
                    agent_id: "agent-1",
                    status: "active",
                    created_at: new Date()
                });

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/agents/agent-1/threads"
                });

                expect(response.statusCode).toBe(201);
                const body = parseResponse(response);
                expect(body.data.id).toBe("thread-1");
                expect(body.data.agent_id).toBe("agent-1");
            });

            it("should return 404 for non-existent agent", async () => {
                mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/agents/non-existent/threads"
                });

                expect(response.statusCode).toBe(404);
            });
        });
    });

    // =========================================================================
    // THREADS ROUTES
    // =========================================================================

    describe("Threads", () => {
        describe("GET /api/v1/threads/:id", () => {
            it("should get thread by ID", async () => {
                mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "thread-1",
                    agent_id: "agent-1",
                    title: "Test Thread",
                    status: "active",
                    created_at: new Date(),
                    updated_at: new Date(),
                    last_message_at: null
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/threads/thread-1"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.id).toBe("thread-1");
            });

            it("should return 404 for non-existent thread", async () => {
                mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/threads/non-existent"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("GET /api/v1/threads/:id/messages", () => {
            it("should get thread messages", async () => {
                mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "thread-1"
                });
                mockAgentExecutionRepo.getMessagesByThread.mockResolvedValue([
                    {
                        id: "msg-1",
                        role: "user",
                        content: "Hello",
                        tool_calls: null,
                        created_at: new Date()
                    },
                    {
                        id: "msg-2",
                        role: "assistant",
                        content: "Hi there!",
                        tool_calls: null,
                        created_at: new Date()
                    }
                ]);

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/threads/thread-1/messages"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.messages).toHaveLength(2);
            });
        });

        describe("DELETE /api/v1/threads/:id", () => {
            it("should delete thread", async () => {
                mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "thread-1"
                });
                mockThreadRepo.delete.mockResolvedValue(true);

                const response = await apiKeyRequest(fastify, {
                    method: "DELETE",
                    url: "/api/v1/threads/thread-1"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.deleted).toBe(true);
            });

            it("should return 404 for non-existent thread", async () => {
                mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "DELETE",
                    url: "/api/v1/threads/non-existent"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("POST /api/v1/threads/:id/messages", () => {
            it("should reject empty message", async () => {
                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/threads/thread-1/messages",
                    payload: {}
                });

                expect(response.statusCode).toBe(400);
                const body = parseResponse(response);
                expect(body.error.code).toBe("validation_error");
            });

            it("should return 404 for non-existent thread", async () => {
                mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/threads/non-existent/messages",
                    payload: { content: "Hello" }
                });

                expect(response.statusCode).toBe(404);
            });
        });
    });

    // =========================================================================
    // TRIGGERS ROUTES
    // =========================================================================

    describe("Triggers", () => {
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

    // =========================================================================
    // KNOWLEDGE BASES ROUTES
    // =========================================================================

    describe("Knowledge Bases", () => {
        describe("GET /api/v1/knowledge-bases", () => {
            it("should list knowledge bases", async () => {
                mockKnowledgeBaseRepo.findByUserId.mockResolvedValue({
                    knowledgeBases: [
                        {
                            id: "kb-1",
                            name: "Test KB",
                            description: "A test knowledge base",
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    ],
                    total: 1
                });
                mockKnowledgeBaseRepo.getStats.mockResolvedValue({
                    document_count: 5,
                    chunk_count: 100
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/knowledge-bases"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data).toHaveLength(1);
                expect(body.data[0].document_count).toBe(5);
            });
        });

        describe("GET /api/v1/knowledge-bases/:id", () => {
            it("should get knowledge base by ID", async () => {
                mockKnowledgeBaseRepo.findById.mockResolvedValue({
                    id: "kb-1",
                    name: "Test KB",
                    description: "A test knowledge base",
                    user_id: TEST_API_KEY_USER_ID,
                    config: {
                        embeddingModel: "text-embedding-3-small",
                        chunkSize: 500,
                        chunkOverlap: 50
                    },
                    created_at: new Date(),
                    updated_at: new Date()
                });
                mockKnowledgeBaseRepo.getStats.mockResolvedValue({
                    document_count: 5,
                    chunk_count: 100
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/knowledge-bases/kb-1"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.id).toBe("kb-1");
                expect(body.data.embedding_model).toBe("text-embedding-3-small");
            });

            it("should return 404 for non-existent knowledge base", async () => {
                mockKnowledgeBaseRepo.findById.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/knowledge-bases/non-existent"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("POST /api/v1/knowledge-bases/:id/query", () => {
            it("should perform semantic search", async () => {
                mockKnowledgeBaseRepo.findById.mockResolvedValue({
                    id: "kb-1",
                    user_id: TEST_API_KEY_USER_ID,
                    config: {
                        embeddingModel: "text-embedding-3-small",
                        embeddingProvider: "openai",
                        embeddingDimensions: 1536
                    }
                });
                mockEmbeddingService.generateEmbeddings.mockResolvedValue({
                    embeddings: [[0.1, 0.2, 0.3]]
                });
                mockKnowledgeChunkRepo.searchSimilar.mockResolvedValue([
                    {
                        id: "chunk-1",
                        content: "Relevant content",
                        document_id: "doc-1",
                        document_name: "test.pdf",
                        similarity: 0.95,
                        metadata: {}
                    }
                ]);

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/knowledge-bases/kb-1/query",
                    payload: { query: "test query", top_k: 5 }
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.results).toHaveLength(1);
                expect(body.data.results[0].score).toBe(0.95);
            });

            it("should reject empty query", async () => {
                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/knowledge-bases/kb-1/query",
                    payload: {}
                });

                expect(response.statusCode).toBe(400);
            });
        });
    });

    // =========================================================================
    // WEBHOOKS ROUTES
    // =========================================================================

    describe("Webhooks", () => {
        describe("GET /api/v1/webhooks", () => {
            it("should list webhooks", async () => {
                mockOutgoingWebhookRepo.findByWorkspaceId.mockResolvedValue({
                    webhooks: [
                        {
                            id: "wh-1",
                            name: "Test Webhook",
                            url: "https://example.com/webhook",
                            events: ["workflow.completed"],
                            is_active: true,
                            created_at: new Date(),
                            updated_at: new Date()
                        }
                    ],
                    total: 1
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/webhooks"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data).toHaveLength(1);
            });
        });

        describe("GET /api/v1/webhooks/:id", () => {
            it("should get webhook by ID", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "wh-1",
                    name: "Test Webhook",
                    url: "https://example.com/webhook",
                    events: ["workflow.completed"],
                    headers: {},
                    is_active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/webhooks/wh-1"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.id).toBe("wh-1");
            });

            it("should return 404 for non-existent webhook", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/webhooks/non-existent"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("POST /api/v1/webhooks", () => {
            it("should create webhook", async () => {
                mockOutgoingWebhookRepo.create.mockResolvedValue({
                    id: "wh-1",
                    name: "New Webhook",
                    url: "https://example.com/webhook",
                    secret: "secret-key",
                    events: ["workflow.completed"],
                    headers: {},
                    is_active: true,
                    created_at: new Date()
                });

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/webhooks",
                    payload: {
                        name: "New Webhook",
                        url: "https://example.com/webhook",
                        events: ["workflow.completed"]
                    }
                });

                expect(response.statusCode).toBe(201);
                const body = parseResponse(response);
                expect(body.data.id).toBe("wh-1");
                expect(body.data.secret).toBe("secret-key");
            });

            it("should reject invalid URL", async () => {
                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/webhooks",
                    payload: {
                        name: "Invalid Webhook",
                        url: "not-a-url",
                        events: ["workflow.completed"]
                    }
                });

                expect(response.statusCode).toBe(400);
                const body = parseResponse(response);
                expect(body.error.message).toContain("Invalid URL");
            });

            it("should reject invalid event types", async () => {
                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/webhooks",
                    payload: {
                        name: "Invalid Events",
                        url: "https://example.com/webhook",
                        events: ["invalid.event"]
                    }
                });

                expect(response.statusCode).toBe(400);
                const body = parseResponse(response);
                expect(body.error.message).toContain("Invalid event types");
            });
        });

        describe("PATCH /api/v1/webhooks/:id", () => {
            it("should update webhook", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "wh-1"
                });
                mockOutgoingWebhookRepo.updateByWorkspace.mockResolvedValue({
                    id: "wh-1",
                    name: "Updated Webhook",
                    url: "https://example.com/webhook",
                    events: ["workflow.completed"],
                    headers: {},
                    is_active: true,
                    updated_at: new Date()
                });

                const response = await apiKeyRequest(fastify, {
                    method: "PATCH",
                    url: "/api/v1/webhooks/wh-1",
                    payload: { name: "Updated Webhook" }
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.name).toBe("Updated Webhook");
            });

            it("should return 404 for non-existent webhook", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "PATCH",
                    url: "/api/v1/webhooks/non-existent",
                    payload: { name: "Updated" }
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("DELETE /api/v1/webhooks/:id", () => {
            it("should delete webhook", async () => {
                mockOutgoingWebhookRepo.deleteByWorkspace.mockResolvedValue(true);

                const response = await apiKeyRequest(fastify, {
                    method: "DELETE",
                    url: "/api/v1/webhooks/wh-1"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.deleted).toBe(true);
            });

            it("should return 404 for non-existent webhook", async () => {
                mockOutgoingWebhookRepo.deleteByWorkspace.mockResolvedValue(false);

                const response = await apiKeyRequest(fastify, {
                    method: "DELETE",
                    url: "/api/v1/webhooks/non-existent"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("POST /api/v1/webhooks/:id/test", () => {
            it("should send test webhook", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "wh-1",
                    url: "https://example.com/webhook",
                    secret: "test-secret",
                    headers: {}
                });

                // Mock global fetch
                const mockFetch = jest.fn().mockResolvedValue({
                    ok: true,
                    status: 200
                });
                global.fetch = mockFetch;

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/webhooks/wh-1/test"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data.success).toBe(true);
            });

            it("should return 404 for non-existent webhook", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "POST",
                    url: "/api/v1/webhooks/non-existent/test"
                });

                expect(response.statusCode).toBe(404);
            });
        });

        describe("GET /api/v1/webhooks/:id/deliveries", () => {
            it("should list webhook deliveries", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue({
                    id: "wh-1"
                });
                mockWebhookDeliveryRepo.findByWebhookId.mockResolvedValue({
                    deliveries: [
                        {
                            id: "del-1",
                            event_type: "workflow.completed",
                            status: "delivered",
                            attempts: 1,
                            response_status: 200,
                            error_message: null,
                            created_at: new Date(),
                            last_attempt_at: new Date()
                        }
                    ],
                    total: 1
                });

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/webhooks/wh-1/deliveries"
                });

                expect(response.statusCode).toBe(200);
                const body = parseResponse(response);
                expect(body.data).toHaveLength(1);
                expect(body.data[0].status).toBe("delivered");
            });

            it("should return 404 for non-existent webhook", async () => {
                mockOutgoingWebhookRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

                const response = await apiKeyRequest(fastify, {
                    method: "GET",
                    url: "/api/v1/webhooks/non-existent/deliveries"
                });

                expect(response.statusCode).toBe(404);
            });
        });
    });

    // =========================================================================
    // RESPONSE FORMAT TESTS
    // =========================================================================

    describe("Response Format", () => {
        it("should include meta with request_id and timestamp", async () => {
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 0
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.meta).toBeDefined();
            expect(body.meta.request_id).toBeDefined();
            expect(body.meta.timestamp).toBeDefined();
        });

        it("should include pagination info for list endpoints", async () => {
            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [],
                total: 100
            });

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows?page=2&per_page=10"
            });

            expect(response.statusCode).toBe(200);
            const body = parseResponse(response);
            expect(body.pagination).toBeDefined();
            expect(body.pagination.page).toBe(2);
            expect(body.pagination.per_page).toBe(10);
            expect(body.pagination.total_count).toBe(100);
            expect(body.pagination.total_pages).toBe(10);
            expect(body.pagination.has_prev).toBe(true);
            expect(body.pagination.has_next).toBe(true);
        });

        it("should format errors consistently", async () => {
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await apiKeyRequest(fastify, {
                method: "GET",
                url: "/api/v1/workflows/non-existent"
            });

            expect(response.statusCode).toBe(404);
            const body = parseResponse(response);
            expect(body.error).toBeDefined();
            expect(body.error.code).toBe("resource_not_found");
            expect(body.error.message).toBeDefined();
            expect(body.meta).toBeDefined();
        });
    });
});
