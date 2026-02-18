/**
 * Agent CRUD Routes Tests
 *
 * Tests for agent management endpoints:
 * - List agents (GET /agents)
 * - Create agent (POST /agents)
 * - Get agent (GET /agents/:id)
 * - Update agent (PUT /agents/:id)
 * - Delete agent (DELETE /agents/:id)
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

describe("Agent CRUD Routes", () => {
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
