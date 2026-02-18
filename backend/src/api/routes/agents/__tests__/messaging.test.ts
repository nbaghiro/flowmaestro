/**
 * Agent Messaging Routes Tests
 *
 * Tests for agent message handling endpoints:
 * - Send message (POST /agents/:id/executions/:executionId/message)
 * - Response handling
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
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockAgentRepo,
    mockAgentExecutionRepo,
    mockThreadRepo,
    mockTemporalClient,
    mockTemporalHandle,
    createMockAgentExecution,
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

describe("Agent Messaging Routes", () => {
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
});
