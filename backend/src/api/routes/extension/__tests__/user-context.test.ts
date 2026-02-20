/**
 * Extension User Context Route Tests
 *
 * Tests for the user context endpoint that returns workflows, agents, and knowledge bases.
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
    mockWorkflowRepo,
    mockAgentRepo,
    mockKnowledgeBaseRepo,
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

jest.mock("../../../../storage/repositories/WorkflowRepository", () => ({
    WorkflowRepository: jest.fn().mockImplementation(() => mockWorkflowRepo)
}));

jest.mock("../../../../storage/repositories/AgentRepository", () => ({
    AgentRepository: jest.fn().mockImplementation(() => mockAgentRepo)
}));

jest.mock("../../../../storage/repositories/KnowledgeBaseRepository", () => ({
    KnowledgeBaseRepository: jest.fn().mockImplementation(() => mockKnowledgeBaseRepo)
}));

describe("Extension User Context Routes", () => {
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
    });

    describe("GET /extension/user-context", () => {
        it("should return user context with workflows, agents, and knowledge bases", async () => {
            const testUser = createTestUser();

            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({
                workflows: [
                    {
                        id: uuidv4(),
                        name: "Test Workflow",
                        description: "A test workflow",
                        definition: {
                            nodes: {
                                input1: { type: "input", name: "Text Input", config: {} }
                            }
                        },
                        updated_at: new Date()
                    }
                ]
            });
            mockAgentRepo.findByWorkspaceId.mockResolvedValue({
                agents: [
                    {
                        id: uuidv4(),
                        name: "Test Agent",
                        description: "A test agent",
                        updated_at: new Date()
                    }
                ]
            });
            mockKnowledgeBaseRepo.findByWorkspaceId.mockResolvedValue({
                knowledgeBases: [
                    {
                        id: uuidv4(),
                        name: "Test KB",
                        description: "A test knowledge base"
                    }
                ]
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/user-context"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                workflows: Array<{ id: string; name: string }>;
                agents: Array<{ id: string; name: string }>;
                knowledgeBases: Array<{ id: string; name: string }>;
            }>(response);
            expect(body.data.workflows).toHaveLength(1);
            expect(body.data.agents).toHaveLength(1);
            expect(body.data.knowledgeBases).toHaveLength(1);
        });

        it("should return empty arrays when no resources exist", async () => {
            const testUser = createTestUser();

            mockWorkflowRepo.findByWorkspaceId.mockResolvedValue({ workflows: [] });
            mockAgentRepo.findByWorkspaceId.mockResolvedValue({ agents: [] });
            mockKnowledgeBaseRepo.findByWorkspaceId.mockResolvedValue({ knowledgeBases: [] });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/user-context"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                workflows: unknown[];
                agents: unknown[];
                knowledgeBases: unknown[];
            }>(response);
            expect(body.data.workflows).toEqual([]);
            expect(body.data.agents).toEqual([]);
            expect(body.data.knowledgeBases).toEqual([]);
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "GET",
                url: "/extension/user-context"
            });

            expectErrorResponse(response, 401);
        });

        it("should return 500 when repositories throw", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findByWorkspaceId.mockRejectedValue(new Error("Database error"));

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/user-context"
            });

            expectErrorResponse(response, 500);
        });
    });
});
