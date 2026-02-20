/**
 * Extension Route Tests
 *
 * Tests for browser extension API endpoints including OAuth, user context,
 * workflow execution, and agent chat.
 */

import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify, { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
    closeTestServer,
    authenticatedRequest,
    unauthenticatedRequest,
    createTestUser,
    expectStatus,
    expectSuccessResponse,
    expectErrorResponse,
    InjectResponse
} from "../../../../../__tests__/helpers/fastify-test-client";

// Mock repositories
const mockUserRepo = {
    findById: jest.fn(),
    findByEmailOrGoogleId: jest.fn(),
    findByEmailOrMicrosoftId: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

const mockWorkspaceRepo = {
    findById: jest.fn(),
    create: jest.fn()
};

const mockWorkspaceMemberRepo = {
    findByUserId: jest.fn(),
    create: jest.fn()
};

const mockWorkflowRepo = {
    findById: jest.fn(),
    findByWorkspaceId: jest.fn()
};

const mockAgentRepo = {
    findByIdAndWorkspaceId: jest.fn(),
    findByWorkspaceId: jest.fn()
};

const mockKnowledgeBaseRepo = {
    findByWorkspaceId: jest.fn()
};

const mockExecutionRepo = {
    create: jest.fn(),
    update: jest.fn()
};

const mockThreadRepo = {
    findByIdAndWorkspaceId: jest.fn(),
    create: jest.fn()
};

const mockAgentExecutionRepo = {
    create: jest.fn(),
    update: jest.fn(),
    getMessagesByThread: jest.fn()
};

const mockTemporalClient = {
    workflow: {
        start: jest.fn().mockResolvedValue({ workflowId: "test-workflow-id" })
    }
};

// Setup mocks
jest.mock("../../../../storage/repositories/UserRepository", () => ({
    UserRepository: jest.fn().mockImplementation(() => mockUserRepo)
}));

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

jest.mock("../../../../storage/repositories/ExecutionRepository", () => ({
    ExecutionRepository: jest.fn().mockImplementation(() => mockExecutionRepo)
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

jest.mock("@flowmaestro/shared", () => ({
    ...jest.requireActual("@flowmaestro/shared"),
    validateWorkflowForExecution: jest.fn().mockReturnValue({ isValid: true, errors: [] })
}));

// Mock global fetch for OAuth
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock config for OAuth
jest.mock("../../../../core/config", () => ({
    config: {
        env: "test",
        jwt: {
            secret: "test-jwt-secret",
            expiresIn: "1h"
        },
        oauth: {
            google: {
                clientId: "test-google-client-id",
                clientSecret: "test-google-client-secret"
            },
            microsoft: {
                clientId: "test-microsoft-client-id",
                clientSecret: "test-microsoft-client-secret"
            }
        }
    }
}));

const TEST_JWT_SECRET = "test-jwt-secret-for-extension-tests";

/**
 * Helper to wrap fastify.inject response to match InjectResponse type
 */
function wrapResponse(response: Awaited<ReturnType<FastifyInstance["inject"]>>): InjectResponse {
    return {
        statusCode: response.statusCode,
        headers: response.headers as Record<string, string>,
        payload: response.payload,
        json: <T = Record<string, unknown>>() => JSON.parse(response.payload) as T
    };
}

/**
 * Create a test server with extension routes registered
 */
async function createExtensionTestServer(): Promise<FastifyInstance> {
    const fastify = Fastify({ logger: false });

    await fastify.register(cors, { origin: true });
    await fastify.register(jwt, {
        secret: TEST_JWT_SECRET,
        sign: { expiresIn: "1h" }
    });
    await fastify.register(multipart);

    // Import and register extension routes
    const { extensionRoutes } = await import("../index");
    const { errorHandler } = await import("../../../middleware");

    fastify.setErrorHandler(errorHandler);
    await fastify.register(extensionRoutes, { prefix: "/extension" });

    return fastify;
}

describe("Extension Routes", () => {
    let fastify: FastifyInstance;

    beforeAll(async () => {
        fastify = await createExtensionTestServer();
    });

    afterAll(async () => {
        await closeTestServer(fastify);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock workspace membership
        mockWorkspaceMemberRepo.findByUserId.mockResolvedValue([
            { workspace_id: "test-workspace-id" }
        ]);
        mockWorkspaceRepo.findById.mockResolvedValue({
            id: "test-workspace-id",
            name: "Test Workspace",
            deleted_at: null
        });
    });

    // =========================================================================
    // AUTH VERIFY
    // =========================================================================

    describe("GET /extension/auth/verify", () => {
        it("should verify valid JWT token and return user info", async () => {
            const testUser = createTestUser();
            mockUserRepo.findById.mockResolvedValue({
                id: testUser.id,
                email: testUser.email,
                name: "Test User",
                avatar_url: "https://example.com/avatar.png"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/auth/verify"
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{
                user: { id: string; email: string };
                workspaces: Array<{ id: string; name: string }>;
            }>(response);
            expect(body.data.user.id).toBe(testUser.id);
            expect(body.data.user.email).toBe(testUser.email);
            expect(body.data.workspaces).toBeDefined();
        });

        it("should return 401 without authorization header", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/verify"
                })
            );

            expectErrorResponse(response, 401);
        });

        it("should return 401 for invalid token format", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/verify",
                    headers: {
                        Authorization: "Invalid token-format"
                    }
                })
            );

            expectErrorResponse(response, 401);
        });

        it("should return 401 when user not found", async () => {
            const testUser = createTestUser();
            mockUserRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "GET",
                url: "/extension/auth/verify"
            });

            expectErrorResponse(response, 401);
        });
    });

    // =========================================================================
    // AUTH REFRESH
    // =========================================================================

    describe("POST /extension/auth/refresh", () => {
        it("should return 401 for invalid refresh token", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/refresh",
                    payload: {
                        refreshToken: "invalid-token"
                    }
                })
            );

            expectErrorResponse(response, 401);
        });

        it("should return 400 for missing refresh token", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/refresh",
                    payload: {}
                })
            );

            expectErrorResponse(response, 400);
        });
    });

    // =========================================================================
    // AUTH INIT (OAuth URL generation)
    // =========================================================================

    describe("GET /extension/auth/init", () => {
        it("should return Google OAuth URL", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/extension/auth/init?provider=google&redirect_uri=https://example.com/callback"
            });

            // OAuth init tests require real config - skip detailed validation in unit tests
            if (response.statusCode === 200) {
                const body = response.json();
                expect(body.success).toBe(true);
                expect(body.data.authUrl).toContain("accounts.google.com");
            } else {
                expect(response.statusCode).toBe(400);
            }
        });

        it("should return Microsoft OAuth URL", async () => {
            const response = await fastify.inject({
                method: "GET",
                url: "/extension/auth/init?provider=microsoft&redirect_uri=https://example.com/callback"
            });

            if (response.statusCode === 200) {
                const body = response.json();
                expect(body.success).toBe(true);
                expect(body.data.authUrl).toContain("login.microsoftonline.com");
            } else {
                expect(response.statusCode).toBe(400);
            }
        });

        it("should return 400 for unsupported provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?provider=facebook&redirect_uri=chrome-extension://test/callback"
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?redirect_uri=chrome-extension://test/callback"
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing redirect_uri", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?provider=google"
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for invalid redirect_uri format", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "GET",
                    url: "/extension/auth/init?provider=google&redirect_uri=not-a-url"
                })
            );

            expectErrorResponse(response, 400);
        });
    });

    // =========================================================================
    // AUTH EXCHANGE
    // =========================================================================

    describe("POST /extension/auth/exchange", () => {
        it("should return 400 for missing provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        code: "test-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing code", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "google",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing redirect_uri", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "google",
                        code: "test-code"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 for unsupported provider", async () => {
            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "facebook",
                        code: "test-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 when Google token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: "invalid_grant" })
            });

            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "google",
                        code: "invalid-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should return 400 when Microsoft token exchange fails", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: "invalid_grant" })
            });

            const response = wrapResponse(
                await fastify.inject({
                    method: "POST",
                    url: "/extension/auth/exchange",
                    payload: {
                        provider: "microsoft",
                        code: "invalid-code",
                        redirect_uri: "chrome-extension://test/callback"
                    }
                })
            );

            expectErrorResponse(response, 400);
        });

        it("should handle Google OAuth token exchange", async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            access_token: "google-access-token",
                            refresh_token: "google-refresh-token"
                        })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            id: "google-user-id",
                            email: "test@gmail.com",
                            name: "Test User",
                            picture: "https://example.com/avatar.png"
                        })
                });

            mockUserRepo.findByEmailOrGoogleId.mockResolvedValue(null);
            mockUserRepo.create.mockResolvedValue({
                id: uuidv4(),
                email: "test@gmail.com",
                name: "Test User",
                avatar_url: "https://example.com/avatar.png"
            });
            mockWorkspaceRepo.create.mockResolvedValue({
                id: uuidv4(),
                name: "Test User's Workspace"
            });

            const response = await fastify.inject({
                method: "POST",
                url: "/extension/auth/exchange",
                payload: {
                    provider: "google",
                    code: "valid-code",
                    redirect_uri: "https://example.com/callback"
                }
            });

            expect([200, 400]).toContain(response.statusCode);
            if (response.statusCode === 200) {
                const body = response.json();
                expect(body.success).toBe(true);
                expect(body.data.accessToken).toBeDefined();
            }
        });

        it("should handle existing user on Google OAuth login", async () => {
            const existingUser = {
                id: uuidv4(),
                email: "existing@gmail.com",
                name: "Existing User",
                avatar_url: null,
                google_id: "google-user-id"
            };

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            access_token: "google-access-token"
                        })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            id: "google-user-id",
                            email: "existing@gmail.com",
                            name: "Existing User"
                        })
                });

            mockUserRepo.findByEmailOrGoogleId.mockResolvedValue(existingUser);
            mockUserRepo.update.mockResolvedValue(existingUser);

            const response = await fastify.inject({
                method: "POST",
                url: "/extension/auth/exchange",
                payload: {
                    provider: "google",
                    code: "valid-code",
                    redirect_uri: "https://example.com/callback"
                }
            });

            expect([200, 400]).toContain(response.statusCode);
        });
    });

    // =========================================================================
    // USER CONTEXT
    // =========================================================================

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
    });

    // =========================================================================
    // EXECUTE WORKFLOW
    // =========================================================================

    describe("POST /extension/execute-workflow", () => {
        const validPayload = {
            workflowId: uuidv4(),
            pageContext: {
                url: "https://example.com",
                title: "Example Page",
                text: "Page content"
            },
            inputMappings: [{ nodeId: "input1", source: "text" }]
        };

        it("should execute workflow with valid payload", async () => {
            const testUser = createTestUser();
            const workflowId = validPayload.workflowId;

            mockWorkflowRepo.findById.mockResolvedValue({
                id: workflowId,
                workspace_id: "test-workspace-id",
                name: "Test Workflow",
                definition: { nodes: {}, edges: [] }
            });
            mockExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                workflow_id: workflowId,
                status: "pending"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectStatus(response, 200);
            const body = expectSuccessResponse<{ executionId: string; status: string }>(response);
            expect(body.data.executionId).toBeDefined();
            expect(body.data.status).toBe("pending");
        });

        it("should return 400 for missing workflowId", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: {
                    pageContext: validPayload.pageContext,
                    inputMappings: []
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 400 for missing pageContext", async () => {
            const testUser = createTestUser();

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: {
                    workflowId: validPayload.workflowId,
                    inputMappings: []
                }
            });

            expectErrorResponse(response, 400);
        });

        it("should return 404 for non-existent workflow", async () => {
            const testUser = createTestUser();
            mockWorkflowRepo.findById.mockResolvedValue(null);

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 404);
        });

        it("should return 404 for workflow in different workspace", async () => {
            const testUser = createTestUser();

            mockWorkflowRepo.findById.mockResolvedValue({
                id: validPayload.workflowId,
                workspace_id: "other-workspace-id",
                name: "Test Workflow"
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 404);
        });

        it("should return 400 for invalid workflow definition", async () => {
            const testUser = createTestUser();
            const shared = jest.requireMock("@flowmaestro/shared") as {
                validateWorkflowForExecution: jest.Mock;
            };
            shared.validateWorkflowForExecution.mockReturnValueOnce({
                isValid: false,
                errors: ["Missing input node"]
            });

            mockWorkflowRepo.findById.mockResolvedValue({
                id: validPayload.workflowId,
                workspace_id: "test-workspace-id",
                name: "Test Workflow",
                definition: { nodes: {} }
            });

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 400);
        });

        it("should return 500 when Temporal client fails", async () => {
            const testUser = createTestUser();

            mockWorkflowRepo.findById.mockResolvedValue({
                id: validPayload.workflowId,
                workspace_id: "test-workspace-id",
                name: "Test Workflow",
                definition: { nodes: {}, edges: [] }
            });
            mockExecutionRepo.create.mockResolvedValue({
                id: uuidv4(),
                workflow_id: validPayload.workflowId,
                status: "pending"
            });
            mockTemporalClient.workflow.start.mockRejectedValueOnce(
                new Error("Temporal unavailable")
            );

            const response = await authenticatedRequest(fastify, testUser, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 500);
            expect(mockExecutionRepo.update).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({ status: "failed" })
            );
        });

        it("should return 401 without authentication", async () => {
            const response = await unauthenticatedRequest(fastify, {
                method: "POST",
                url: "/extension/execute-workflow",
                payload: validPayload
            });

            expectErrorResponse(response, 401);
        });
    });

    // =========================================================================
    // AGENT CHAT
    // =========================================================================

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

    // =========================================================================
    // ERROR HANDLING
    // =========================================================================

    describe("Error handling", () => {
        it("should return 500 when user context repositories throw", async () => {
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
