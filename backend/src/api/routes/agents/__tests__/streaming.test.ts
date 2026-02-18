/**
 * Agent Streaming Routes Tests
 *
 * Tests for SSE streaming endpoints:
 * - GET /agents/:id/executions/:executionId/stream
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    expectErrorResponse,
    unauthenticatedRequest
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockAgentRepo,
    mockAgentExecutionRepo,
    mockThreadRepo,
    mockTemporalClient,
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

describe("Agent Streaming Routes", () => {
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
});
