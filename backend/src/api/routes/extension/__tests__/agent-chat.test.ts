/**
 * Extension Agent Chat Route Tests
 *
 * Tests for agent chat interactions from the browser extension.
 */

import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    authenticatedRequest,
    unauthenticatedRequest,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse
} from "../../../../../__tests__/helpers/fastify-test-client";
import {
    mockWorkspaceRepo,
    mockWorkspaceMemberRepo,
    mockAgentRepo,
    mockThreadRepo,
    mockAgentExecutionRepo,
    mockTemporalClient,
    createExtensionTestServer,
    setupDefaultMocks,
    closeTestServer
} from "./setup";

// Setup mocks
jest.mock("../../../../storage/repositories/WorkspaceRepository", () => ({
    WorkspaceRepository: jest.fn().mockImplementation(() => mockWorkspaceRepo)
}));

jest.mock("../../../../storage/repositories/WorkspaceMemberRepository", () => ({
    WorkspaceMemberRepository: jest.fn().mockImplementation(() => mockWorkspaceMemberRepo)
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

jest.mock("../../../../temporal/client", () => ({
    getTemporalClient: jest.fn().mockResolvedValue(mockTemporalClient)
}));

describe("Extension Agent Chat Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createExtensionTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        setupDefaultMocks();
        mockTemporalClient.workflow.start.mockResolvedValue({ workflowId: "test-workflow-id" });
    });

    describe("POST /extension/agent-chat", () => {
        const validPayload = {
            agentId: uuidv4(),
            message: "Hello, agent!",
            includePageContext: false
        };

        it("should start agent chat and create new thread", async () => {
            const testUser = createTestUser();
            const agentId = validPayload.agentId;

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: agentId,
                name: "Test Agent"
            });
            mockThreadRepo.create.mockResolvedValue({
                id: uuidv4(),
                agent_id: agentId
            });
            mockAgentExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                agent_id: agentId,
                status: "running"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: validPayload
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                executionId: string;
                threadId: string;
                status: string;
            }>(response);
            expect(body.data.executionId).toBeDefined();
            expect(body.data.threadId).toBeDefined();
            expect(body.data.status).toBe("started");
        });

        it("should continue existing thread", async () => {
            const testUser = createTestUser();
            const agentId = validPayload.agentId;
            const threadId = uuidv4();

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: agentId,
                name: "Test Agent"
            });
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: threadId,
                agent_id: agentId
            });
            mockAgentExecutionRepo.getMessagesByThread.mockResolvedValue([
                { id: uuidv4(), role: "user", content: "Previous message", created_at: new Date() }
            ]);
            mockAgentExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                agent_id: agentId,
                thread_id: threadId,
                status: "running"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: {
                    ...validPayload,
                    threadId
                }
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ threadId: string }>(response);
            expect(body.data.threadId).toBe(threadId);
        });

        it("should include page context when requested", async () => {
            const testUser = createTestUser();
            const agentId = validPayload.agentId;

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: agentId,
                name: "Test Agent"
            });
            mockThreadRepo.create.mockResolvedValue({
                id: uuidv4(),
                agent_id: agentId
            });
            mockAgentExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                status: "running"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: {
                    ...validPayload,
                    includePageContext: true,
                    pageContext: {
                        url: "https://example.com",
                        title: "Example Page",
                        text: "Page content to include"
                    }
                }
            });

            expectStatus(response, 200);
        });

        it("should return 400 for missing agentId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: {
                    message: "Hello",
                    includePageContext: false
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing message", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: {
                    agentId: validPayload.agentId,
                    includePageContext: false
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 404 for non-existent agent", async () => {
            const testUser = createTestUser();
            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: validPayload
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for non-existent thread", async () => {
            const testUser = createTestUser();

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: validPayload.agentId,
                name: "Test Agent"
            });
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: {
                    ...validPayload,
                    threadId: uuidv4()
                }
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 when thread belongs to different agent", async () => {
            const testUser = createTestUser();
            const threadId = uuidv4();

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: validPayload.agentId,
                name: "Test Agent"
            });
            mockThreadRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: threadId,
                agent_id: uuidv4() // Different agent
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: {
                    ...validPayload,
                    threadId
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 500 when Temporal client fails", async () => {
            const testUser = createTestUser();

            mockAgentRepo.findByIdAndWorkspaceId.mockResolvedValue({
                id: validPayload.agentId,
                name: "Test Agent"
            });
            mockThreadRepo.create.mockResolvedValue({
                id: uuidv4(),
                agent_id: validPayload.agentId
            });
            mockAgentExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                status: "running"
            });
            mockTemporalClient.workflow.start.mockRejectedValueOnce(
                new Error("Temporal unavailable")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: validPayload
            });

            expectErrorResponse(response, 500);
            expect(mockAgentExecutionRepo.update).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ status: "failed" })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/extension/agent-chat",
                payload: validPayload
            });

            expectErrorResponse(response, 401);
        });
    });
});
