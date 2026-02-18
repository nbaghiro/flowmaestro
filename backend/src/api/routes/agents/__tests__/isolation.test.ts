/**
 * Agent Multi-tenant Isolation Tests
 *
 * Tests for multi-tenant isolation:
 * - User A cannot access user B's agent
 * - Agents are listed only for current workspace
 * - Agents created are assigned to authenticated user and workspace
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

import {
    authenticatedRequest,
    closeTestServer,
    createTestServer,
    createTestUser,
    createTestAgentConfig,
    expectErrorResponse,
    DEFAULT_TEST_WORKSPACE_ID
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockAgentRepo,
    mockAgentExecutionRepo,
    mockThreadRepo,
    mockTemporalClient,
    createMockAgent,
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

describe("Agent Multi-tenant Isolation", () => {
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
        mockAgentRepo.create.mockImplementation((data) => Promise.resolve(createMockAgent(data)));

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
