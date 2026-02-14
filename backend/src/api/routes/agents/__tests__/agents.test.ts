/**
 * Agent Routes Integration Tests
 *
 * Tests for agent management endpoints including:
 * - CRUD operations (list, create, get, update, delete)
 * - Tool management
 * - Agent execution (execute, stream, send-message)
 * - Execution management (list, get)
 * - Multi-tenant isolation
 * - Provider validation
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock agent repository
const mockAgentRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    })),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

// Mock agent execution repository
const mockAgentExecutionRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByAgentId: jest.fn(),
    getMessagesByThread: jest.fn(),
    update: jest.fn()
};

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
}));

// Mock thread repository
const mockThreadRepo = {
    create: jest.fn(),
    findByIdAndWorkspaceId: jest.fn()
};

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
}));

// Mock Temporal client for agent execution
const mockTemporalHandle = {
    signal: jest.fn().mockResolvedValue(undefined)
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

// Mock Temporal workflow signal
jest.mock("../../../../temporal/workflows/agent-orchestrator", () => ({
    userMessageSignal: "userMessage"
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    createTestAgentConfig,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAgent(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        name: string;
        description: string;
        model: string;
        provider: string;
        system_prompt: string;
        temperature: number;
        max_tokens: number;
        max_iterations: number;
        available_tools: object[];
        memory_config: object;
        connection_id: string | null;
        folder_id: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: overrides.name || "Test Agent",
        description: overrides.description || "A test agent",
        model: overrides.model || "gpt-4",
        provider: overrides.provider || "openai",
        system_prompt: overrides.system_prompt || "You are a helpful assistant.",
        temperature: overrides.temperature ?? 0.7,
        max_tokens: overrides.max_tokens ?? 4096,
        max_iterations: overrides.max_iterations ?? 100,
        available_tools: overrides.available_tools || [],
        memory_config: overrides.memory_config || { type: "buffer", max_messages: 50 },
        connection_id: overrides.connection_id ?? null,
        folder_id: overrides.folder_id ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function createMockAgentExecution(
    overrides: Partial<{
        id: string;
        agent_id: string;
        user_id: string;
        thread_id: string;
        workspace_id: string;
        status: string;
        iterations: number;
        tool_calls_count: number;
        thread_history: object[];
        error: string | null;
        started_at: Date;
        completed_at: Date | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        agent_id: overrides.agent_id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        thread_id: overrides.thread_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        status: overrides.status || "running",
        iterations: overrides.iterations ?? 0,
        tool_calls_count: overrides.tool_calls_count ?? 0,
        thread_history: overrides.thread_history || [],
        error: overrides.error ?? null,
        started_at: overrides.started_at || new Date(),
        completed_at: overrides.completed_at ?? null,
        created_at: new Date(),
        updated_at: new Date()
    };
}

function createMockThread(
    overrides: Partial<{
        id: string;
        user_id: string;
        workspace_id: string;
        agent_id: string;
        title: string | null;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: overrides.user_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        agent_id: overrides.agent_id || uuidv4(),
        title: overrides.title ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function resetAllMocks() {
    jest.clearAllMocks();

    // Reset agent repository behaviors
    mockAgentRepo.findByWorkspaceId.mockResolvedValue([]);
    mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockAgentRepo.findById.mockResolvedValue(null);
    mockAgentRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockAgent({ ...data, id: uuidv4() }))
    );
    mockAgentRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockAgent({ id, ...data }))
    );
    mockAgentRepo.delete.mockResolvedValue(true);

    // Reset agent execution repository behaviors
    mockAgentExecutionRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockAgentExecution({ ...data, id: uuidv4() }))
    );
    mockAgentExecutionRepo.findById.mockResolvedValue(null);
    mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);
    mockAgentExecutionRepo.findByAgentId.mockResolvedValue({ executions: [], total: 0 });
    mockAgentExecutionRepo.getMessagesByThread.mockResolvedValue([]);
    mockAgentExecutionRepo.update.mockImplementation((id, data) =>
        Promise.resolve(createMockAgentExecution({ id, ...data }))
    );

    // Reset thread repository behaviors
    mockThreadRepo.create.mockImplementation((data) =>
        Promise.resolve(createMockThread({ ...data, id: uuidv4() }))
    );
    mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

    // Reset Temporal mocks
    mockTemporalHandle.signal.mockResolvedValue(undefined);
    mockTemporalClient.workflow.start.mockResolvedValue(mockTemporalHandle);
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Routes", () => {
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
    // LIST AGENTS
    // ========================================================================

    describe("GET /agents", () => {
        it("should list agents for authenticated user", async () => {
            const testUser = createTestUser();
            const agents = [
                createMockAgent({ user_id: testUser.id, name: "Agent 1" }),
                createMockAgent({ user_id: testUser.id, name: "Agent 2" })
            ];
            mockAgentRepo.findByWorkspaceId.mockResolvedValue(agents);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/agents"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(2);
        });

        it("should return empty list for new user", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByWorkspaceId.mockResolvedValue([]);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/agents"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<object[]>(response);
            expect(body.data).toHaveLength(0);
        });

        it("should filter by folderId", async () => {
            const testUser = createTestUser();
            const folderId = uuidv4();
            mockAgentRepo.findByWorkspaceId.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/agents",
                query: { folderId }
            });

            expect(mockAgentRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.objectContaining({ folderId })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/agents"
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // CREATE AGENT
    // ========================================================================

    describe("POST /agents", () => {
        it("should create agent with valid data", async () => {
            const testUser = createTestUser();
            const agentData = createTestAgentConfig("New Agent");

            const createdAgent = createMockAgent({
                user_id: testUser.id,
                ...agentData
            });
            mockAgentRepo.create.mockResolvedValue(createdAgent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("New Agent");
        });

        it("should create agent with openai provider", async () => {
            const testUser = createTestUser();
            const agentData = createTestAgentConfig("OpenAI Agent");

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({ user_id: testUser.id, provider: "openai" })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: { ...agentData, provider: "openai" }
            });

            expectStatus(response, 201);
        });

        it("should create agent with anthropic provider", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Anthropic Agent",
                model: "claude-3-opus",
                provider: "anthropic",
                system_prompt: "You are Claude."
            };

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({ user_id: testUser.id, provider: "anthropic" })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 201);
        });

        it("should create agent with google provider", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Google Agent",
                model: "gemini-pro",
                provider: "google",
                system_prompt: "You are a helpful assistant."
            };

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({ user_id: testUser.id, provider: "google" })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 201);
        });

        it("should create agent with cohere provider", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Cohere Agent",
                model: "command",
                provider: "cohere",
                system_prompt: "You are a helpful assistant."
            };

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({ user_id: testUser.id, provider: "cohere" })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 201);
        });

        it("should return 400 for invalid provider", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Invalid Agent",
                model: "some-model",
                provider: "invalid_provider",
                system_prompt: "Test"
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 400);
        });

        it("should return 400 for temperature out of range (> 2)", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Hot Agent",
                model: "gpt-4",
                provider: "openai",
                system_prompt: "Test",
                temperature: 2.5 // Max is 2
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 400);
        });

        it("should return 400 for temperature out of range (< 0)", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Cold Agent",
                model: "gpt-4",
                provider: "openai",
                system_prompt: "Test",
                temperature: -0.5
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 400);
        });

        it("should return 400 for max_tokens out of range", async () => {
            const testUser = createTestUser();
            const agentData = {
                name: "Large Token Agent",
                model: "gpt-4",
                provider: "openai",
                system_prompt: "Test",
                max_tokens: 200000 // Max is 100000
            };

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentData
            });

            expectStatus(response, 400);
        });

        it("should return 400 for missing required fields", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: {
                    // Missing name, model, provider
                    description: "Only description"
                }
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/agents",
                payload: createTestAgentConfig()
            });

            expectErrorResponse(response, 401);
        });
    });

    // ========================================================================
    // GET AGENT BY ID
    // ========================================================================

    describe("GET /agents/:id", () => {
        it("should return agent for owner", async () => {
            const testUser = createTestUser();
            const agent = createMockAgent({
                id: uuidv4(),
                user_id: testUser.id,
                name: "My Agent"
            });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agent.id}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; name: string }>(response);
            expect(body.data.name).toBe("My Agent");
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid UUID format", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/agents/not-a-uuid"
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // UPDATE AGENT
    // ========================================================================

    describe("PUT /agents/:id", () => {
        it("should update agent for owner", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingAgent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                name: "Old Name"
            });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(existingAgent);
            mockAgentRepo.update.mockResolvedValue({
                ...existingAgent,
                name: "New Name"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}`,
                payload: { name: "New Name" }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ name: string }>(response);
            expect(body.data.name).toBe("New Name");
        });

        it("should update temperature", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingAgent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                temperature: 0.7
            });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(existingAgent);
            mockAgentRepo.update.mockResolvedValue({
                ...existingAgent,
                temperature: 0.9
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}`,
                payload: { temperature: 0.9 }
            });

            expectStatus(response, 200);
        });

        it("should update provider", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingAgent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                provider: "openai"
            });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(existingAgent);
            mockAgentRepo.update.mockResolvedValue({
                ...existingAgent,
                provider: "anthropic"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}`,
                payload: { provider: "anthropic" }
            });

            expectStatus(response, 200);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${uuidv4()}`,
                payload: { name: "Updated" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid temperature", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingAgent = createMockAgent({
                id: agentId,
                user_id: testUser.id
            });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(existingAgent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "PUT",
                url: `/agents/${agentId}`,
                payload: { temperature: 5.0 } // Out of range
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // DELETE AGENT
    // ========================================================================

    describe("DELETE /agents/:id", () => {
        it("should delete agent for owner", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id
            });
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${agentId}`
            });

            expectStatus(response, 200);
            expect(mockAgentRepo.delete).toHaveBeenCalledWith(agentId);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should not delete other user's agent (multi-tenant)", async () => {
            const testUser = createTestUser();
            // findByIdAndWorkspaceId returns null because workspace_id doesn't match
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
            expect(mockAgentRepo.delete).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // ADD TOOL
    // ========================================================================

    describe("POST /agents/:id/tools", () => {
        const validTool = {
            type: "function",
            name: "test_tool",
            description: "A test tool",
            schema: { type: "object", properties: {} },
            config: {}
        };

        it("should add tool to agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: []
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [{ id: "tool_123", ...validTool }]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools`,
                payload: validTool
            });

            expectStatus(response, 200);
            const body = response.json<{ success: boolean; data: { tool: { name: string } } }>();
            expect(body.success).toBe(true);
            expect(body.data.tool.name).toBe("test_tool");
        });

        it("should return 400 for duplicate tool name", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingTool = { id: "tool_existing", ...validTool };
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: [existingTool]
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools`,
                payload: validTool
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("already exists");
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/tools`,
                payload: validTool
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid tool type", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools`,
                payload: { ...validTool, type: "invalid_type" }
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // ADD TOOLS BATCH
    // ========================================================================

    describe("POST /agents/:id/tools/batch", () => {
        const createTool = (name: string) => ({
            type: "function" as const,
            name,
            description: `Tool ${name}`,
            schema: { type: "object", properties: {} },
            config: {}
        });

        it("should add multiple tools in batch", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: []
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [
                    { id: "tool_1", ...createTool("tool_a") },
                    { id: "tool_2", ...createTool("tool_b") }
                ]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools/batch`,
                payload: {
                    tools: [createTool("tool_a"), createTool("tool_b")]
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                data: { added: object[]; skipped: object[] };
            }>();
            expect(body.data.added).toHaveLength(2);
            expect(body.data.skipped).toHaveLength(0);
        });

        it("should skip tools with duplicate names in existing agent tools", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingTool = { id: "existing", ...createTool("existing_tool") };
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: [existingTool]
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [existingTool, { id: "new", ...createTool("new_tool") }]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools/batch`,
                payload: {
                    tools: [createTool("existing_tool"), createTool("new_tool")]
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                data: { added: object[]; skipped: { name: string; reason: string }[] };
            }>();
            expect(body.data.added).toHaveLength(1);
            expect(body.data.skipped).toHaveLength(1);
            expect(body.data.skipped[0].name).toBe("existing_tool");
        });

        it("should skip duplicate tools within the same batch", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: []
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: [{ id: "tool_1", ...createTool("same_name") }]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools/batch`,
                payload: {
                    tools: [createTool("same_name"), createTool("same_name")]
                }
            });

            expectStatus(response, 200);
            const body = response.json<{
                data: { added: object[]; skipped: { name: string; reason: string }[] };
            }>();
            expect(body.data.added).toHaveLength(1);
            expect(body.data.skipped).toHaveLength(1);
            expect(body.data.skipped[0].reason).toContain("Duplicate");
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/tools/batch`,
                payload: { tools: [createTool("tool")] }
            });

            expectErrorResponse(response, 404);
        });

        it("should handle empty result when all tools are skipped", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const existingTool = { id: "existing", ...createTool("existing_tool") };
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: [existingTool]
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/tools/batch`,
                payload: { tools: [createTool("existing_tool")] }
            });

            expectStatus(response, 200);
            const body = response.json<{
                data: { added: object[]; skipped: object[] };
            }>();
            expect(body.data.added).toHaveLength(0);
            expect(body.data.skipped).toHaveLength(1);
        });
    });

    // ========================================================================
    // REMOVE TOOL
    // ========================================================================

    describe("DELETE /agents/:id/tools/:toolId", () => {
        it("should remove tool from agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const toolId = "tool_to_remove";
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: [
                    { id: toolId, name: "tool1", type: "function", description: "", schema: {}, config: {} },
                    { id: "tool_keep", name: "tool2", type: "function", description: "", schema: {}, config: {} }
                ]
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentRepo.update.mockResolvedValue({
                ...agent,
                available_tools: agent.available_tools.filter((t) => t.id !== toolId)
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${agentId}/tools/${toolId}`
            });

            expectStatus(response, 200);
            expect(mockAgentRepo.update).toHaveBeenCalledWith(
                agentId,
                expect.objectContaining({
                    available_tools: expect.arrayContaining([
                        expect.objectContaining({ id: "tool_keep" })
                    ])
                })
            );
        });

        it("should return 404 for non-existent tool", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                available_tools: []
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${agentId}/tools/nonexistent`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "DELETE",
                url: `/agents/${uuidv4()}/tools/some_tool`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // MULTI-TENANT ISOLATION
    // ========================================================================

    describe("Multi-tenant Isolation", () => {
        it("user A cannot access user B's agent", async () => {
            const userA = createTestUser({ id: uuidv4(), email: "usera@example.com" });
            // findByIdAndWorkspaceId enforces workspace access
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, userA, {
                method: "GET",
                url: `/agents/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("agents are listed only for current workspace", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByWorkspaceId.mockResolvedValue([]);

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/agents"
            });

            expect(mockAgentRepo.findByWorkspaceId).toHaveBeenCalledWith(
                DEFAULT_TEST_WORKSPACE_ID,
                expect.any(Object)
            );
        });

        it("agents created are assigned to authenticated user and workspace", async () => {
            const testUser = createTestUser();
            mockAgentRepo.create.mockImplementation((data) =>
                Promise.resolve(createMockAgent(data))
            );

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: createTestAgentConfig()
            });

            expect(mockAgentRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: testUser.id,
                    workspace_id: DEFAULT_TEST_WORKSPACE_ID
                })
            );
        });
    });

    // ========================================================================
    // EXECUTE AGENT
    // ========================================================================

    describe("POST /agents/:id/execute", () => {
        it("should execute agent and create new thread", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });
            const newThread = createMockThread({
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                agent_id: agentId
            });
            const execution = createMockAgentExecution({
                agent_id: agentId,
                user_id: testUser.id,
                thread_id: newThread.id,
                status: "running"
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockThreadRepo.create.mockResolvedValue(newThread);
            mockAgentExecutionRepo.create.mockResolvedValue(execution);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/execute`,
                payload: { message: "Hello, agent!" }
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{
                executionId: string;
                threadId: string;
                agentId: string;
                status: string;
            }>(response);
            expect(body.data.agentId).toBe(agentId);
            expect(body.data.status).toBe("running");
            expect(body.data.threadId).toBeDefined();
            expect(body.data.executionId).toBeDefined();
            expect(mockTemporalClient.workflow.start).toHaveBeenCalled();
        });

        it("should execute agent with existing thread", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const threadId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });
            const existingThread = createMockThread({
                id: threadId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                agent_id: agentId
            });
            const execution = createMockAgentExecution({
                agent_id: agentId,
                user_id: testUser.id,
                thread_id: threadId,
                status: "running"
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(existingThread);
            mockAgentExecutionRepo.getMessagesByThread.mockResolvedValue([]);
            mockAgentExecutionRepo.create.mockResolvedValue(execution);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/execute`,
                payload: { message: "Continue conversation", thread_id: threadId }
            });

            expectStatus(response, 201);
            const body = expectSuccessResponse<{ threadId: string }>(response);
            expect(body.data.threadId).toBe(threadId);
        });

        it("should return 400 for thread belonging to different agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const otherAgentId = uuidv4();
            const threadId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });
            const threadFromOtherAgent = createMockThread({
                id: threadId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                agent_id: otherAgentId // Different agent
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(threadFromOtherAgent);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/execute`,
                payload: { message: "Hello", thread_id: threadId }
            });

            expectStatus(response, 400);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/execute`,
                payload: { message: "Hello" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for non-existent thread", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/execute`,
                payload: { message: "Hello", thread_id: uuidv4() }
            });

            // Note: Execute handler wraps errors in BadRequestError
            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("Thread not found");
        });

        it("should return 400 for missing message", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/execute`,
                payload: {}
            });

            expectStatus(response, 400);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: `/agents/${uuidv4()}/execute`,
                payload: { message: "Hello" }
            });

            expectErrorResponse(response, 401);
        });

        it("should pass connection_id override to Temporal", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const connectionId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });
            const newThread = createMockThread({
                user_id: testUser.id,
                agent_id: agentId
            });
            const execution = createMockAgentExecution({
                agent_id: agentId,
                user_id: testUser.id,
                thread_id: newThread.id
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockThreadRepo.create.mockResolvedValue(newThread);
            mockAgentExecutionRepo.create.mockResolvedValue(execution);

            await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/execute`,
                payload: { message: "Hello", connection_id: connectionId }
            });

            expect(mockTemporalClient.workflow.start).toHaveBeenCalledWith(
                "agentOrchestratorWorkflow",
                expect.objectContaining({
                    args: [expect.objectContaining({ connectionId })]
                })
            );
        });
    });

    // ========================================================================
    // LIST AGENT EXECUTIONS
    // ========================================================================

    describe("GET /agents/:id/executions", () => {
        it("should list executions for agent", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });
            const executions = [
                createMockAgentExecution({
                    agent_id: agentId,
                    status: "completed",
                    thread_history: [{ role: "user", content: "Hello there!" }]
                }),
                createMockAgentExecution({
                    agent_id: agentId,
                    status: "running",
                    thread_history: [{ role: "user", content: "Another message" }]
                })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentExecutionRepo.findByAgentId.mockResolvedValue({
                executions,
                total: 2
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/executions`
            });

            expectStatus(response, 200);
            const body = response.json<{
                data: { executions: object[]; pagination: { total: number } };
            }>();
            expect(body.data.executions).toHaveLength(2);
            expect(body.data.pagination.total).toBe(2);
        });

        it("should filter executions by status", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const agent = createMockAgent({
                id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID
            });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentExecutionRepo.findByAgentId.mockResolvedValue({
                executions: [],
                total: 0
            });

            await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/executions`,
                query: { status: "completed" }
            });

            expect(mockAgentExecutionRepo.findByAgentId).toHaveBeenCalledWith(
                agentId,
                expect.objectContaining({ status: "completed" })
            );
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // GET AGENT EXECUTION
    // ========================================================================

    describe("GET /agents/:id/executions/:executionId", () => {
        it("should return execution details", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const executionId = uuidv4();
            const execution = createMockAgentExecution({
                id: executionId,
                agent_id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                status: "completed"
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${agentId}/executions/${executionId}`
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ id: string; status: string }>(response);
            expect(body.data.id).toBe(executionId);
            expect(body.data.status).toBe("completed");
        });

        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });
    });

    // ========================================================================
    // SEND MESSAGE TO EXECUTION
    // ========================================================================

    describe("POST /agents/:id/executions/:executionId/message", () => {
        it("should send message to running execution", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const executionId = uuidv4();
            const execution = createMockAgentExecution({
                id: executionId,
                agent_id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                status: "running"
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/executions/${executionId}/message`,
                payload: { message: "Additional input" }
            });

            expectStatus(response, 200);
            expect(mockTemporalHandle.signal).toHaveBeenCalledWith(
                "userMessage",
                "Additional input"
            );
        });

        it("should return 400 for non-running execution", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const executionId = uuidv4();
            const execution = createMockAgentExecution({
                id: executionId,
                agent_id: agentId,
                user_id: testUser.id,
                workspace_id: DEFAULT_TEST_WORKSPACE_ID,
                status: "completed"
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/executions/${executionId}/message`,
                payload: { message: "Too late" }
            });

            expectStatus(response, 400);
            const body = response.json<{ error: string }>();
            expect(body.error).toContain("completed");
        });

        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${uuidv4()}/executions/${uuidv4()}/message`,
                payload: { message: "Hello" }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for empty message", async () => {
            const testUser = createTestUser();
            const agentId = uuidv4();
            const executionId = uuidv4();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: `/agents/${agentId}/executions/${executionId}/message`,
                payload: { message: "" }
            });

            expectStatus(response, 400);
        });
    });

    // ========================================================================
    // STREAM AGENT EXECUTION (SSE)
    // ========================================================================

    describe("GET /agents/:id/executions/:executionId/stream", () => {
        it("should return 404 for non-existent execution", async () => {
            const testUser = createTestUser();
            mockAgentExecutionRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions/${uuidv4()}/stream`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for execution belonging to different user", async () => {
            const testUser = createTestUser();
            const otherUserId = uuidv4();
            const execution = createMockAgentExecution({
                user_id: otherUserId,
                status: "running"
            });

            mockAgentExecutionRepo.findById.mockResolvedValue(execution);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions/${execution.id}/stream`
            });

            expectErrorResponse(response, 404);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions/${uuidv4()}/stream`
            });

            expectErrorResponse(response, 401);
        });

        // Note: Full SSE streaming tests require integration testing with actual
        // SSE connections. These tests verify authorization and error handling.
    });

    // ========================================================================
    // EDGE CASES
    // ========================================================================

    describe("Edge Cases", () => {
        it("should handle agent with all optional fields", async () => {
            const testUser = createTestUser();
            const minimalAgent = {
                name: "Minimal Agent",
                model: "gpt-3.5-turbo",
                provider: "openai"
            };

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({ user_id: testUser.id, ...minimalAgent })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: minimalAgent
            });

            expectStatus(response, 201);
        });

        it("should handle agent with custom memory config", async () => {
            const testUser = createTestUser();
            const agentWithMemory = {
                name: "Memory Agent",
                model: "gpt-4",
                provider: "openai",
                memory_config: {
                    type: "vector",
                    max_messages: 100
                }
            };

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({
                    user_id: testUser.id,
                    memory_config: agentWithMemory.memory_config
                })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agentWithMemory
            });

            expectStatus(response, 201);
        });

        it("should handle agent name at max length (100 chars)", async () => {
            const testUser = createTestUser();
            const longName = "A".repeat(100);
            const agent = {
                name: longName,
                model: "gpt-4",
                provider: "openai"
            };

            mockAgentRepo.create.mockResolvedValue(
                createMockAgent({ user_id: testUser.id, name: longName })
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: agent
            });

            expectStatus(response, 201);
        });

        it("should reject agent name exceeding max length", async () => {
            const testUser = createTestUser();
            const tooLongName = "A".repeat(101);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/agents",
                payload: {
                    name: tooLongName,
                    model: "gpt-4",
                    provider: "openai"
                }
            });

            expectStatus(response, 400);
        });
    });
});
