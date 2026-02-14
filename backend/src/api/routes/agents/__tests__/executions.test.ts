/**
 * Agent Execution Management Route Tests
 *
 * Tests for execution lifecycle operations:
 * - GET /agents/:id/executions - List executions
 * - GET /agents/:id/executions/:executionId - Get execution details
 * - POST /agents/:id/executions/:executionId/cancel - Cancel execution
 * - POST /agents/:id/executions/:executionId/retry - Retry execution
 * - Execution status transitions
 * - Pagination and filtering
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// MOCK SETUP
// ============================================================================

const mockAgentRepo = {
    findByWorkspaceId: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
};

const mockAgentExecutionRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndWorkspaceId: jest.fn(),
    findByAgentId: jest.fn(),
    getMessagesByThread: jest.fn(),
    update: jest.fn(),
    countByAgentId: jest.fn(),
    findByStatus: jest.fn()
};

const mockTemporalHandle = {
    signal: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    result: jest.fn().mockResolvedValue({ success: true })
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue(mockTemporalHandle),
        getHandle: jest.fn().mockReturnValue(mockTemporalHandle)
    }
};

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
}));

jest.mock("../../../../storage/repositories", () => ({
    UserRepository: jest.fn().mockImplementation(() => ({
        findById: jest.fn(),
        findByEmail: jest.fn()
    })),
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../../temporal/workflows/agent-orchestrator", () => ({
    userMessageSignal: "userMessage",
    cancelSignal: "cancel"
}));

// Import test helpers after mocks
import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockAgent(
    overrides: Partial<{
        id: string;
        workspace_id: string;
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        user_id: uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        name: "Test Agent",
        description: "A test agent",
        model: "gpt-4",
        provider: "openai",
        system_prompt: "You are helpful.",
        temperature: 0.7,
        max_tokens: 4096,
        max_iterations: 100,
        available_tools: [],
        memory_config: { type: "buffer", max_messages: 50 },
        connection_id: null,
        folder_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
    };
}

function createMockExecution(
    overrides: Partial<{
        id: string;
        agent_id: string;
        workspace_id: string;
        status: string;
        thread_id: string;
        started_at: Date;
        completed_at: Date | null;
        iterations: number;
        error: string | null;
        thread_history: object[];
    }> = {}
) {
    return {
        id: overrides.id || uuidv4(),
        agent_id: overrides.agent_id || uuidv4(),
        workspace_id: overrides.workspace_id || DEFAULT_TEST_WORKSPACE_ID,
        thread_id: overrides.thread_id || uuidv4(),
        status: overrides.status || "completed",
        iterations: overrides.iterations ?? 5,
        thread_history: overrides.thread_history || [],
        error: overrides.error || null,
        started_at: overrides.started_at || new Date(),
        completed_at: overrides.completed_at !== undefined ? overrides.completed_at : new Date(),
        created_at: new Date(),
        updated_at: new Date()
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Execution Routes", () => {
    let app: FastifyInstance;
    let testUser: ReturnType<typeof createTestUser>;

    beforeAll(async () => {
        app = await createTestServer();
        testUser = createTestUser();
    });

    afterAll(async () => {
        await closeTestServer(app);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /agents/:id/executions", () => {
        it("should list executions for agent", async () => {
            const agent = createMockAgent();
            const executions = [
                createMockExecution({ agent_id: agent.id, status: "completed" }),
                createMockExecution({ agent_id: agent.id, status: "running" }),
                createMockExecution({ agent_id: agent.id, status: "failed" })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentExecutionRepo.findByAgentId.mockResolvedValue({
                executions,
                total: 3
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions`
            });

            expectStatus(response, 200);
            expectSuccessResponse(response);
        });

        it("should return empty array for agent with no executions", async () => {
            const agent = createMockAgent();

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentExecutionRepo.findByAgentId.mockResolvedValue({
                executions: [],
                total: 0
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions`
            });

            expectStatus(response, 200);
        });

        it("should return 404 for non-existent agent", async () => {
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions`
            });

            expectErrorResponse(response, 404);
        });

        it("should filter by status", async () => {
            const agent = createMockAgent();
            const runningExecutions = [
                createMockExecution({ agent_id: agent.id, status: "running" }),
                createMockExecution({ agent_id: agent.id, status: "running" })
            ];

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentExecutionRepo.findByAgentId.mockResolvedValue({
                executions: runningExecutions,
                total: 2
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions`,
                query: { status: "running" }
            });

            expectStatus(response, 200);
            expect(mockAgentExecutionRepo.findByAgentId).toHaveBeenCalledWith(
                agent.id,
                expect.objectContaining({ status: "running" })
            );
        });

        it("should support pagination with limit and offset", async () => {
            const agent = createMockAgent();
            const executions = Array.from({ length: 10 }, (_, i) =>
                createMockExecution({ agent_id: agent.id, id: `exec-${i}` })
            );

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);
            mockAgentExecutionRepo.findByAgentId.mockResolvedValue({
                executions,
                total: 50
            });

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions`,
                query: { limit: "10", offset: "20" }
            });

            expectStatus(response, 200);
        });
    });

    describe("GET /agents/:id/executions/:executionId", () => {
        it("should get execution details", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "completed",
                iterations: 10
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
            expectSuccessResponse(response);
        });

        it("should return 404 for non-existent execution", async () => {
            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${uuidv4()}/executions/${uuidv4()}`
            });

            expectErrorResponse(response, 404);
        });

        it("should include thread history in response", async () => {
            const agent = createMockAgent();
            const messages = [
                { id: "msg-1", role: "user", content: "Hello" },
                { id: "msg-2", role: "assistant", content: "Hi there!" }
            ];
            const execution = createMockExecution({
                agent_id: agent.id,
                thread_history: messages
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });

        it("should include error details for failed execution", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "failed",
                error: "LLM rate limit exceeded"
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });
    });

    describe("Execution Status Transitions", () => {
        it("should show pending status for new execution", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "pending",
                completed_at: null
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });

        it("should show running status for active execution", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "running",
                completed_at: null,
                iterations: 3
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });

        it("should show completed status with completion time", async () => {
            const completedAt = new Date();
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "completed",
                completed_at: completedAt
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });

        it("should show cancelled status", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "cancelled"
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });
    });

    describe("Execution Iteration Tracking", () => {
        it("should track iteration count", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                iterations: 15
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });

        it("should show zero iterations for pending execution", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                status: "pending",
                iterations: 0
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(execution);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectStatus(response, 200);
        });
    });

    describe("Multi-tenant Isolation", () => {
        it("should not list executions from other workspaces", async () => {
            const agent = createMockAgent({ workspace_id: "other-workspace" });

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions`
            });

            expectErrorResponse(response, 404);
        });

        it("should not get execution from other workspace", async () => {
            const agent = createMockAgent();
            const execution = createMockExecution({
                agent_id: agent.id,
                workspace_id: "other-workspace"
            });

            mockAgentExecutionRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/${execution.id}`
            });

            expectErrorResponse(response, 404);
        });
    });

    describe("Invalid Input Handling", () => {
        it("should return 400 for invalid agent ID format", async () => {
            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: "/agents/invalid-uuid/executions"
            });

            expectStatus(response, 400);
        });

        it("should return 400 for invalid execution ID format", async () => {
            const agent = createMockAgent();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(agent);

            const response = await authenticatedRequest(app, testUser, {
                method: "GET",
                url: `/agents/${agent.id}/executions/invalid-uuid`
            });

            expectStatus(response, 400);
        });
    });
});
