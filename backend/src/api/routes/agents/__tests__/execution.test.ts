/**
 * Agent Execution Routes Tests
 *
 * Tests for agent execution endpoints:
 * - Execute agent (POST /agents/:id/execute)
 * - List executions (GET /agents/:id/executions)
 * - Get execution (GET /agents/:id/executions/:executionId)
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    expectStatus,
    expectSuccessResponse,
    unauthenticatedRequest,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockAgentRepo,
    mockAgentExecutionRepo,
    mockThreadRepo,
    mockTemporalClient,
    createMockAgent,
    createMockAgentExecution,
    createMockThread,
    resetAllMocks
} from "./helpers/test-utils";

// ============================================================================
// MOCK SETUP
// ============================================================================

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

jest.mock("../../../../storage/repositories/AgentExecutionRepository", () => ({
    AgentExecutionRepository: jest.fn().mockImplementation(() => mockAgentExecutionRepo)
}));

jest.mock("../../../../storage/repositories/ThreadRepository", () => ({
    ThreadRepository: jest.fn().mockImplementation(() => mockThreadRepo)
}));

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient),
    closeTemporalConnection: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../../temporal/workflows/agent-orchestrator", () => ({
    userMessageSignal: "userMessage"
}));

// ============================================================================
// TESTS
// ============================================================================

describe("Agent Execution Routes", () => {
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
});
