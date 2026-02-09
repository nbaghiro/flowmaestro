/**
 * API Client Tests
 *
 * Tests for core API functions: authentication, workflows, and request handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createMockFetchResponse,
    createMockApiResponse,
    createMockApiError,
    createMockUser,
    createMockAuthToken,
    mockFetchOnce
} from "../../test-helpers";
import {
    login,
    register,
    getCurrentUser,
    getAuthToken,
    setAuthToken,
    clearAuthToken,
    getWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    forgotPassword,
    resetPassword,
    // Agent functions
    getAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    // Knowledge base functions
    getKnowledgeBases,
    getKnowledgeBase,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    // Thread functions
    getThreads,
    getThread,
    createThread,
    updateThread,
    deleteThread,
    // Connection functions
    getConnections,
    getConnection,
    createConnection,
    deleteConnection,
    // Folder functions
    getFolders,
    getFolder,
    createFolder,
    updateFolder as updateFolderApi,
    deleteFolder as deleteFolderApi,
    // User account functions
    updateUserName,
    updateUserEmail,
    setUserPassword,
    changeUserPassword,
    // 2FA functions
    sendTwoFactorCode,
    verifyTwoFactorCode,
    disableTwoFactor,
    // Trigger functions
    getTriggers,
    getTrigger,
    createTrigger,
    updateTrigger,
    deleteTrigger,
    // Workspace functions
    getWorkspaces,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    inviteWorkspaceMember,
    // Form Interface functions
    getFormInterfaces,
    getFormInterface,
    createFormInterface,
    updateFormInterface,
    deleteFormInterface,
    publishFormInterface,
    unpublishFormInterface,
    duplicateFormInterface,
    getFormInterfaceSubmissions,
    // Chat Interface functions
    getChatInterfaces,
    getChatInterface,
    createChatInterface,
    updateChatInterface,
    deleteChatInterface,
    publishChatInterface,
    unpublishChatInterface,
    duplicateChatInterface,
    getChatInterfaceSessions,
    // API Key functions
    getApiKeys,
    getApiKey,
    createApiKey,
    updateApiKey,
    rotateApiKey,
    revokeApiKey,
    // Execution functions
    getExecutions,
    getExecution,
    submitUserResponse,
    // Checkpoint functions
    listCheckpoints,
    createCheckpoint,
    restoreCheckpoint,
    deleteCheckpoint,
    renameCheckpoint
} from "../api";

describe("API Client", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    // ===== Auth Token Functions =====
    describe("Auth Token Management", () => {
        it("getAuthToken returns null when no token stored", () => {
            expect(getAuthToken()).toBeNull();
        });

        it("setAuthToken stores token in localStorage", () => {
            const token = createMockAuthToken();
            setAuthToken(token);
            expect(localStorage.getItem("auth_token")).toBe(token);
        });

        it("getAuthToken returns stored token", () => {
            const token = createMockAuthToken();
            localStorage.setItem("auth_token", token);
            expect(getAuthToken()).toBe(token);
        });

        it("clearAuthToken removes token from localStorage", () => {
            localStorage.setItem("auth_token", "test-token");
            clearAuthToken();
            expect(localStorage.getItem("auth_token")).toBeNull();
        });
    });

    // ===== Login Tests =====
    describe("login", () => {
        it("returns user and token on successful login", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: mockUser, token: mockToken }))
            );

            const result = await login("test@example.com", "password123");

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("user");
            expect(result.data).toHaveProperty("token");
        });

        it("returns two_factor_required when 2FA is needed", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        two_factor_required: true,
                        masked_phone: "***-***-1234"
                    })
                )
            );

            const result = await login("test@example.com", "password123");

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("two_factor_required", true);
        });

        it("completes login with 2FA code", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: mockUser, token: mockToken }))
            );

            const result = await login("test@example.com", "password123", "123456");

            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty("user");

            // Verify code was sent in request
            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);
            expect(body.code).toBe("123456");
        });

        it("throws error on invalid credentials", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Invalid credentials"), false, 401)
            );

            await expect(login("test@example.com", "wrong")).rejects.toThrow("Invalid credentials");
        });

        it("throws error on network failure", async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            await expect(login("test@example.com", "password")).rejects.toThrow("Network error");
        });
    });

    // ===== Register Tests =====
    describe("register", () => {
        it("returns user and token on successful registration", async () => {
            const mockUser = createMockUser();
            const mockToken = createMockAuthToken();

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: mockUser, token: mockToken }))
            );

            const result = await register("new@example.com", "password123", "New User");

            expect(result.success).toBe(true);
            expect(result.data?.user.email).toBe("test@example.com");
        });

        it("sends name in request body when provided", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        user: createMockUser(),
                        token: createMockAuthToken()
                    })
                )
            );

            await register("new@example.com", "password123", "New User");

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);
            expect(body.name).toBe("New User");
        });

        it("throws error on duplicate email", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Email already registered"), false, 400)
            );

            await expect(register("existing@example.com", "password123")).rejects.toThrow(
                "Email already registered"
            );
        });

        it("throws error on validation failure", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Password too short"), false, 400)
            );

            await expect(register("test@example.com", "123")).rejects.toThrow("Password too short");
        });
    });

    // ===== getCurrentUser Tests =====
    describe("getCurrentUser", () => {
        it("returns user data with valid token", async () => {
            const mockUser = createMockUser();
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ user: mockUser })));

            const result = await getCurrentUser();

            expect(result.success).toBe(true);
            expect(result.data?.user.id).toBe("user-123");
        });

        it("throws error when no token stored", async () => {
            await expect(getCurrentUser()).rejects.toThrow("No authentication token found");
        });

        it("throws error on invalid token", async () => {
            localStorage.setItem("auth_token", "invalid-token");

            mockFetchOnce(createMockFetchResponse(createMockApiError("Invalid token"), false, 401));

            await expect(getCurrentUser()).rejects.toThrow("Invalid token");
        });

        it("includes Authorization header with token", async () => {
            const token = createMockAuthToken();
            localStorage.setItem("auth_token", token);

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: createMockUser() }))
            );

            await getCurrentUser();

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const headers = fetchCall[1]?.headers as Headers;
            expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
        });
    });

    // ===== Password Reset Tests =====
    describe("forgotPassword", () => {
        it("sends password reset email", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ message: "Reset email sent" }))
            );

            const result = await forgotPassword("test@example.com");

            expect(result.success).toBe(true);
            expect(result.data?.message).toBe("Reset email sent");
        });

        it("sends email in request body", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ message: "Sent" })));

            await forgotPassword("test@example.com");

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);
            expect(body.email).toBe("test@example.com");
        });
    });

    describe("resetPassword", () => {
        it("resets password with valid token", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({ message: "Password reset successfully" })
                )
            );

            const result = await resetPassword("reset-token", "newpassword123");

            expect(result.success).toBe(true);
        });

        it("throws error on invalid reset token", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Invalid or expired token"), false, 400)
            );

            await expect(resetPassword("invalid-token", "newpassword123")).rejects.toThrow(
                "Invalid or expired token"
            );
        });
    });

    // ===== Workflow Tests =====
    describe("getWorkflows", () => {
        it("returns paginated list of workflows", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());
            const mockWorkflows = [
                { id: "wf-1", name: "Workflow 1" },
                { id: "wf-2", name: "Workflow 2" }
            ];

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        workflows: mockWorkflows,
                        total: 2
                    })
                )
            );

            const result = await getWorkflows({ limit: 50, offset: 0 });

            expect(result.success).toBe(true);
            expect(result.data.workflows).toHaveLength(2);
        });

        it("includes pagination params in query string", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ workflows: [], total: 0 }))
            );

            await getWorkflows({ limit: 25, offset: 50 });

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const url = fetchCall[0] as string;
            expect(url).toContain("limit=25");
            expect(url).toContain("offset=50");
        });

        it("filters by folderId when provided", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ workflows: [], total: 0 }))
            );

            await getWorkflows({ folderId: "folder-123" });

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const url = fetchCall[0] as string;
            expect(url).toContain("folderId=folder-123");
        });

        it("filters by folderId=null for root level", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ workflows: [], total: 0 }))
            );

            await getWorkflows({ folderId: null });

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const url = fetchCall[0] as string;
            expect(url).toContain("folderId=null");
        });
    });

    describe("getWorkflow", () => {
        it("returns workflow by ID", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());
            const mockWorkflow = { id: "wf-123", name: "Test Workflow" };

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ workflow: mockWorkflow }))
            );

            const result = await getWorkflow("wf-123");

            expect(result.success).toBe(true);
            expect(result.data.workflow.id).toBe("wf-123");
        });

        it("throws error when workflow not found", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Workflow not found"), false, 404)
            );

            await expect(getWorkflow("nonexistent")).rejects.toThrow("Workflow not found");
        });

        it("throws error when unauthorized", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(createMockFetchResponse(createMockApiError("Unauthorized"), false, 403));

            await expect(getWorkflow("wf-123")).rejects.toThrow("Unauthorized");
        });
    });

    describe("createWorkflow", () => {
        it("creates workflow with default definition", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        workflow: { id: "wf-new", name: "New Workflow" }
                    })
                )
            );

            const result = await createWorkflow("New Workflow");

            expect(result.success).toBe(true);
            expect(result.data.workflow.name).toBe("New Workflow");
        });

        it("creates workflow with custom definition", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        workflow: { id: "wf-new", name: "Custom Workflow" }
                    })
                )
            );

            const customDefinition = {
                name: "Custom Workflow",
                nodes: {},
                edges: [],
                entryPoint: "custom-entry"
            };

            await createWorkflow("Custom Workflow", "Description", customDefinition);

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);
            expect(body.definition.entryPoint).toBe("custom-entry");
        });

        it("throws error on validation failure", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Name is required"), false, 400)
            );

            await expect(createWorkflow("")).rejects.toThrow("Name is required");
        });
    });

    describe("updateWorkflow", () => {
        it("updates workflow successfully", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        workflow: { id: "wf-123", name: "Updated Name" }
                    })
                )
            );

            const result = await updateWorkflow("wf-123", { name: "Updated Name" });

            expect(result.success).toBe(true);
            expect(result.data.workflow.name).toBe("Updated Name");
        });

        it("throws error on validation failure", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Invalid definition"), false, 400)
            );

            await expect(updateWorkflow("wf-123", { definition: {} as never })).rejects.toThrow(
                "Invalid definition"
            );
        });
    });

    describe("deleteWorkflow", () => {
        it("deletes workflow successfully", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

            const result = await deleteWorkflow("wf-123");

            expect(result.success).toBe(true);
        });

        it("throws error when workflow not found", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Workflow not found"), false, 404)
            );

            await expect(deleteWorkflow("nonexistent")).rejects.toThrow("Workflow not found");
        });
    });

    describe("executeWorkflow", () => {
        it("executes workflow with outputs", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse({
                    success: true,
                    data: {
                        workflowId: "wf-123",
                        result: {
                            success: true,
                            outputs: { result: "Hello, World!" }
                        }
                    }
                })
            );

            const result = await executeWorkflow(
                [{ type: "llm", name: "LLM", config: {}, position: { x: 0, y: 0 } }],
                [],
                { input: "test" }
            );

            expect(result.success).toBe(true);
            expect(result.data?.result.outputs).toHaveProperty("result");
        });

        it("handles execution failure", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiError("Execution failed"), false, 500)
            );

            await expect(executeWorkflow([], [], {})).rejects.toThrow("Execution failed");
        });

        it("sends workflow definition in request body", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse({
                    success: true,
                    data: {
                        workflowId: "wf-123",
                        result: { success: true, outputs: {} }
                    }
                })
            );

            const nodes = [{ type: "llm", name: "Test", config: {}, position: { x: 0, y: 0 } }];
            const edges = [{ id: "e1", source: "n1", target: "n2" }];
            const inputs = { prompt: "Hello" };

            await executeWorkflow(nodes, edges, inputs);

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const body = JSON.parse(fetchCall[1]?.body as string);

            expect(body.workflowDefinition.nodes).toEqual(nodes);
            expect(body.workflowDefinition.edges).toEqual(edges);
            expect(body.inputs).toEqual(inputs);
        });
    });

    // ===== Request Headers Tests =====
    describe("Request Headers", () => {
        it("includes X-Session-ID header in requests", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: createMockUser() }))
            );

            await getCurrentUser();

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const headers = fetchCall[1]?.headers as Headers;
            // Headers object from apiFetch
            expect(headers.get("X-Session-ID")).toBeTruthy();
        });

        it("includes Authorization header when token is set", async () => {
            const token = createMockAuthToken();
            localStorage.setItem("auth_token", token);

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ user: createMockUser() }))
            );

            await getCurrentUser();

            const fetchCall = vi.mocked(fetch).mock.calls[0];
            const headers = fetchCall[1]?.headers as Headers;
            expect(headers.get("Authorization")).toBe(`Bearer ${token}`);
        });

        it("deleteWorkflow returns success object", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            // Delete operations return { success: true }
            mockFetchOnce({
                ok: true,
                status: 200,
                statusText: "OK",
                json: () => Promise.resolve({ success: true }),
                text: () => Promise.resolve(""),
                headers: new Headers()
            } as Response);

            const result = await deleteWorkflow("wf-123");

            // Should return success object
            expect(result).toEqual({ success: true });
        });
    });

    // ===== Error Handling Tests =====
    describe("Error Handling", () => {
        it("handles non-JSON error response", async () => {
            localStorage.setItem("auth_token", createMockAuthToken());

            mockFetchOnce({
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
                json: () => Promise.reject(new Error("Invalid JSON")),
                text: () => Promise.resolve("Internal Server Error"),
                headers: new Headers()
            } as Response);

            await expect(getWorkflows()).rejects.toThrow("HTTP 500: Internal Server Error");
        });

        it("handles network timeout", async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error("Request timeout"));

            await expect(login("test@example.com", "password")).rejects.toThrow("Request timeout");
        });
    });

    // ===== Agent API Tests =====
    describe("Agent API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getAgents", () => {
            it("returns list of agents", async () => {
                const mockAgents = [
                    { id: "agent-1", name: "Agent 1" },
                    { id: "agent-2", name: "Agent 2" }
                ];

                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ agents: mockAgents }))
                );

                const result = await getAgents();

                expect(result.success).toBe(true);
                expect(result.data.agents).toHaveLength(2);
            });

            it("filters by folderId", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ agents: [] })));

                await getAgents({ folderId: "folder-123" });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const url = fetchCall[0] as string;
                expect(url).toContain("folderId=folder-123");
            });
        });

        describe("getAgent", () => {
            it("returns agent by ID", async () => {
                const mockAgent = { id: "agent-123", name: "Test Agent" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockAgent)));

                const result = await getAgent("agent-123");

                expect(result.success).toBe(true);
                expect(result.data.id).toBe("agent-123");
            });

            it("throws error when agent not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Agent not found"), false, 404)
                );

                await expect(getAgent("nonexistent")).rejects.toThrow("Agent not found");
            });
        });

        describe("createAgent", () => {
            it("creates agent successfully", async () => {
                const mockAgent = { id: "agent-new", name: "New Agent" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockAgent)));

                const result = await createAgent({
                    name: "New Agent",
                    model: "gpt-4",
                    provider: "openai",
                    system_prompt: "You are helpful"
                });

                expect(result.success).toBe(true);
                expect(result.data.name).toBe("New Agent");
            });

            it("sends agent data in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ id: "agent-1" })));

                await createAgent({
                    name: "Test Agent",
                    model: "gpt-4",
                    provider: "openai",
                    system_prompt: "Be helpful",
                    temperature: 0.7
                });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("Test Agent");
                expect(body.system_prompt).toBe("Be helpful");
            });
        });

        describe("updateAgent", () => {
            it("updates agent successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "agent-123", name: "Updated" })
                    )
                );

                const result = await updateAgent("agent-123", { name: "Updated" });

                expect(result.success).toBe(true);
                expect(result.data.name).toBe("Updated");
            });
        });

        describe("deleteAgent", () => {
            it("deletes agent successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteAgent("agent-123");

                expect(result.success).toBe(true);
            });
        });
    });

    // ===== Knowledge Base API Tests =====
    describe("Knowledge Base API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getKnowledgeBases", () => {
            it("returns list of knowledge bases", async () => {
                const mockKBs = [
                    { id: "kb-1", name: "KB 1" },
                    { id: "kb-2", name: "KB 2" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKBs)));

                const result = await getKnowledgeBases();

                expect(result.success).toBe(true);
                expect(result.data).toHaveLength(2);
            });

            it("supports pagination", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse([])));

                await getKnowledgeBases({ limit: 10, offset: 20 });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const url = fetchCall[0] as string;
                expect(url).toContain("limit=10");
                expect(url).toContain("offset=20");
            });
        });

        describe("getKnowledgeBase", () => {
            it("returns knowledge base by ID", async () => {
                const mockKB = { id: "kb-123", name: "Test KB" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKB)));

                const result = await getKnowledgeBase("kb-123");

                expect(result.success).toBe(true);
                expect(result.data?.id).toBe("kb-123");
            });
        });

        describe("createKnowledgeBase", () => {
            it("creates knowledge base successfully", async () => {
                const mockKB = { id: "kb-new", name: "New KB" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKB)));

                const result = await createKnowledgeBase({
                    name: "New KB",
                    description: "A new knowledge base"
                });

                expect(result.success).toBe(true);
                expect(result.data?.name).toBe("New KB");
            });
        });

        describe("updateKnowledgeBase", () => {
            it("updates knowledge base successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "kb-123", name: "Updated KB" })
                    )
                );

                const result = await updateKnowledgeBase("kb-123", { name: "Updated KB" });

                expect(result.success).toBe(true);
            });
        });

        describe("deleteKnowledgeBase", () => {
            it("deletes knowledge base successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteKnowledgeBase("kb-123");

                expect(result.success).toBe(true);
            });
        });
    });

    // ===== Thread API Tests =====
    describe("Thread API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getThreads", () => {
            it("returns list of threads", async () => {
                const mockThreads = [
                    { id: "thread-1", title: "Thread 1" },
                    { id: "thread-2", title: "Thread 2" }
                ];

                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ threads: mockThreads }))
                );

                const result = await getThreads();

                expect(result.success).toBe(true);
                expect(result.data.threads).toHaveLength(2);
            });

            it("filters by agent_id", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ threads: [] })));

                await getThreads({ agent_id: "agent-123" });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const url = fetchCall[0] as string;
                expect(url).toContain("agent_id=agent-123");
            });

            it("filters by status", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ threads: [] })));

                await getThreads({ status: "active" });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const url = fetchCall[0] as string;
                expect(url).toContain("status=active");
            });
        });

        describe("getThread", () => {
            it("returns thread by ID", async () => {
                const mockThread = { id: "thread-123", title: "Test Thread" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockThread)));

                const result = await getThread("thread-123");

                expect(result.success).toBe(true);
                expect(result.data?.id).toBe("thread-123");
            });
        });

        describe("createThread", () => {
            it("creates thread successfully", async () => {
                const mockThread = { id: "thread-new", title: "New Thread" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockThread)));

                const result = await createThread({
                    agent_id: "agent-123",
                    title: "New Thread",
                    status: "active"
                });

                expect(result.success).toBe(true);
                expect(result.data?.title).toBe("New Thread");
            });
        });

        describe("updateThread", () => {
            it("updates thread title", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "thread-123", title: "Updated Title" })
                    )
                );

                const result = await updateThread("thread-123", { title: "Updated Title" });

                expect(result.success).toBe(true);
            });
        });

        describe("deleteThread", () => {
            it("deletes thread successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteThread("thread-123");

                expect(result.success).toBe(true);
            });
        });
    });

    // ===== Connection API Tests =====
    describe("Connection API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getConnections", () => {
            it("returns list of connections", async () => {
                const mockConnections = [
                    { id: "conn-1", name: "OpenAI" },
                    { id: "conn-2", name: "Anthropic" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockConnections)));

                const result = await getConnections();

                expect(result.success).toBe(true);
                expect(result.data).toHaveLength(2);
            });

            it("filters by provider", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse([])));

                await getConnections({ provider: "openai" });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const url = fetchCall[0] as string;
                expect(url).toContain("provider=openai");
            });
        });

        describe("getConnection", () => {
            it("returns connection by ID", async () => {
                const mockConnection = { id: "conn-123", name: "Test Connection" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockConnection)));

                const result = await getConnection("conn-123");

                expect(result.success).toBe(true);
                expect(result.data.id).toBe("conn-123");
            });
        });

        describe("createConnection", () => {
            it("creates connection successfully", async () => {
                const mockConnection = { id: "conn-new", name: "New Connection" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockConnection)));

                const result = await createConnection({
                    name: "New Connection",
                    provider: "openai",
                    connection_method: "api_key",
                    data: { api_key: "sk-test" }
                });

                expect(result.success).toBe(true);
            });
        });

        describe("deleteConnection", () => {
            it("deletes connection successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteConnection("conn-123");

                expect(result.success).toBe(true);
            });
        });
    });

    // ===== Folder API Tests =====
    describe("Folder API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getFolders", () => {
            it("returns list of folders", async () => {
                const mockFolders = [
                    { id: "folder-1", name: "Folder 1" },
                    { id: "folder-2", name: "Folder 2" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockFolders)));

                const result = await getFolders();

                expect(result.success).toBe(true);
                expect(result.data).toHaveLength(2);
            });
        });

        describe("getFolder", () => {
            it("returns folder by ID", async () => {
                const mockFolder = { id: "folder-123", name: "Test Folder" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockFolder)));

                const result = await getFolder("folder-123");

                expect(result.success).toBe(true);
                expect(result.data?.id).toBe("folder-123");
            });
        });

        describe("createFolder", () => {
            it("creates folder successfully", async () => {
                const mockFolder = { id: "folder-new", name: "New Folder" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockFolder)));

                const result = await createFolder({ name: "New Folder" });

                expect(result.success).toBe(true);
                expect(result.data?.name).toBe("New Folder");
            });

            it("creates folder with parent", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "folder-new", parentId: "parent-123" })
                    )
                );

                await createFolder({ name: "Subfolder", parentId: "parent-123" });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.parentId).toBe("parent-123");
            });
        });

        describe("updateFolderApi", () => {
            it("updates folder name", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "folder-123", name: "Updated Name" })
                    )
                );

                const result = await updateFolderApi("folder-123", { name: "Updated Name" });

                expect(result.success).toBe(true);
            });
        });

        describe("deleteFolderApi", () => {
            it("deletes folder successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteFolderApi("folder-123");

                expect(result.success).toBe(true);
            });
        });
    });

    // ===== User Account API Tests =====
    describe("User Account API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("updateUserName", () => {
            it("updates user name successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "Name updated" }))
                );

                const result = await updateUserName("New Name");

                expect(result.success).toBe(true);
            });

            it("sends name in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

                await updateUserName("John Doe");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("John Doe");
            });

            it("throws error when no token", async () => {
                localStorage.clear();

                await expect(updateUserName("Test")).rejects.toThrow(
                    "No authentication token found"
                );
            });

            it("throws error on validation failure", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Name too short"), false, 400)
                );

                await expect(updateUserName("")).rejects.toThrow("Name too short");
            });
        });

        describe("updateUserEmail", () => {
            it("updates user email successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "Email updated" }))
                );

                const result = await updateUserEmail("new@example.com");

                expect(result.success).toBe(true);
            });

            it("sends email in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

                await updateUserEmail("new@example.com");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.email).toBe("new@example.com");
            });

            it("throws error when email already in use", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Email already in use"), false, 400)
                );

                await expect(updateUserEmail("taken@example.com")).rejects.toThrow(
                    "Email already in use"
                );
            });
        });

        describe("setUserPassword", () => {
            it("sets password for OAuth-only user", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "Password set" }))
                );

                const result = await setUserPassword("newpassword123");

                expect(result.success).toBe(true);
            });

            it("sends password in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

                await setUserPassword("securepassword");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.password).toBe("securepassword");
            });

            it("throws error when user already has password", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("User already has a password"),
                        false,
                        400
                    )
                );

                await expect(setUserPassword("password123")).rejects.toThrow(
                    "User already has a password"
                );
            });
        });

        describe("changeUserPassword", () => {
            it("changes password successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "Password changed" }))
                );

                const result = await changeUserPassword("oldpassword", "newpassword");

                expect(result.success).toBe(true);
            });

            it("sends current and new password in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

                await changeUserPassword("currentPass", "newPass");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.currentPassword).toBe("currentPass");
                expect(body.newPassword).toBe("newPass");
            });

            it("throws error when current password is wrong", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Current password is incorrect"),
                        false,
                        400
                    )
                );

                await expect(changeUserPassword("wrong", "newpass")).rejects.toThrow(
                    "Current password is incorrect"
                );
            });
        });
    });

    // ===== Two-Factor Authentication API Tests =====
    describe("Two-Factor Authentication API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("sendTwoFactorCode", () => {
            it("sends verification code to phone", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "Code sent" }))
                );

                const result = await sendTwoFactorCode("+1234567890");

                expect(result.success).toBe(true);
            });

            it("sends phone in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

                await sendTwoFactorCode("+1234567890");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.phone).toBe("+1234567890");
            });

            it("throws error when no token", async () => {
                localStorage.clear();

                await expect(sendTwoFactorCode("+1234567890")).rejects.toThrow(
                    "No authentication token found"
                );
            });

            it("throws error on invalid phone", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Invalid phone number"), false, 400)
                );

                await expect(sendTwoFactorCode("invalid")).rejects.toThrow("Invalid phone number");
            });
        });

        describe("verifyTwoFactorCode", () => {
            it("verifies code and enables 2FA", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "2FA enabled" }))
                );

                const result = await verifyTwoFactorCode("123456", "+1234567890");

                expect(result.success).toBe(true);
            });

            it("sends code and phone in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

                await verifyTwoFactorCode("654321", "+1234567890");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.code).toBe("654321");
                expect(body.phone).toBe("+1234567890");
            });

            it("throws error on invalid code", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Invalid verification code"),
                        false,
                        400
                    )
                );

                await expect(verifyTwoFactorCode("000000", "+1234567890")).rejects.toThrow(
                    "Invalid verification code"
                );
            });

            it("throws error on expired code", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Code expired"), false, 400)
                );

                await expect(verifyTwoFactorCode("123456", "+1234567890")).rejects.toThrow(
                    "Code expired"
                );
            });
        });

        describe("disableTwoFactor", () => {
            it("disables 2FA successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "2FA disabled" }))
                );

                const result = await disableTwoFactor();

                expect(result.success).toBe(true);
            });

            it("throws error when no token", async () => {
                localStorage.clear();

                await expect(disableTwoFactor()).rejects.toThrow("No authentication token found");
            });

            it("throws error when 2FA not enabled", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("2FA is not enabled"), false, 400)
                );

                await expect(disableTwoFactor()).rejects.toThrow("2FA is not enabled");
            });
        });
    });

    // ===== Trigger API Tests =====
    describe("Trigger API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getTriggers", () => {
            it("returns list of triggers for workflow", async () => {
                const mockTriggers = [
                    { id: "trigger-1", type: "webhook", enabled: true },
                    { id: "trigger-2", type: "schedule", enabled: false }
                ];

                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ data: mockTriggers }))
                );

                const result = await getTriggers("workflow-123");

                expect(result.success).toBe(true);
            });

            it("includes workflowId in query string", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ data: [] })));

                await getTriggers("workflow-456");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const url = fetchCall[0] as string;
                expect(url).toContain("workflowId=workflow-456");
            });
        });

        describe("getTrigger", () => {
            it("returns trigger by ID", async () => {
                const mockTrigger = { id: "trigger-123", type: "webhook", enabled: true };

                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ data: mockTrigger }))
                );

                const result = await getTrigger("trigger-123");

                expect(result.success).toBe(true);
            });

            it("throws error when trigger not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Trigger not found"), false, 404)
                );

                await expect(getTrigger("nonexistent")).rejects.toThrow("Trigger not found");
            });
        });

        describe("createTrigger", () => {
            it("creates webhook trigger", async () => {
                const mockTrigger = { id: "trigger-new", type: "webhook", enabled: true };

                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ data: mockTrigger }))
                );

                const result = await createTrigger({
                    workflowId: "workflow-123",
                    triggerType: "webhook",
                    name: "API Webhook",
                    enabled: true,
                    config: {}
                });

                expect(result.success).toBe(true);
            });

            it("creates schedule trigger with cron expression", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ data: { id: "trigger-new", type: "schedule" } })
                    )
                );

                await createTrigger({
                    workflowId: "workflow-123",
                    triggerType: "schedule",
                    name: "Daily Job",
                    enabled: true,
                    config: { cronExpression: "0 9 * * *" }
                });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.triggerType).toBe("schedule");
                expect(body.config.cronExpression).toBe("0 9 * * *");
            });

            it("throws error on invalid cron expression", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Invalid cron expression"),
                        false,
                        400
                    )
                );

                await expect(
                    createTrigger({
                        workflowId: "workflow-123",
                        triggerType: "schedule",
                        name: "Bad Schedule",
                        enabled: true,
                        config: { cronExpression: "invalid" }
                    })
                ).rejects.toThrow("Invalid cron expression");
            });
        });

        describe("updateTrigger", () => {
            it("updates trigger successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({
                            data: { id: "trigger-123", enabled: false }
                        })
                    )
                );

                const result = await updateTrigger("trigger-123", { enabled: false });

                expect(result.success).toBe(true);
            });

            it("sends update data in request body", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ data: { id: "trigger-123" } }))
                );

                await updateTrigger("trigger-123", {
                    name: "Updated Trigger",
                    enabled: true
                });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("Updated Trigger");
                expect(body.enabled).toBe(true);
            });
        });

        describe("deleteTrigger", () => {
            it("deletes trigger successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ message: "Deleted" }))
                );

                const result = await deleteTrigger("trigger-123");

                expect(result.success).toBe(true);
            });

            it("throws error when trigger not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Trigger not found"), false, 404)
                );

                await expect(deleteTrigger("nonexistent")).rejects.toThrow("Trigger not found");
            });
        });
    });

    // ===== Workspace API Tests =====
    describe("Workspace API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getWorkspaces", () => {
            it("returns list of workspaces", async () => {
                const mockOwnedWorkspaces = [{ id: "ws-1", name: "Personal" }];
                const mockMemberWorkspaces = [{ id: "ws-2", name: "Team" }];

                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({
                            owned: mockOwnedWorkspaces,
                            member: mockMemberWorkspaces
                        })
                    )
                );

                const result = await getWorkspaces();

                expect(result.success).toBe(true);
                expect(result.data?.owned).toHaveLength(1);
                expect(result.data?.member).toHaveLength(1);
            });

            it("returns owned and member workspaces separately", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({
                            owned: [{ id: "ws-1", name: "Personal" }],
                            member: []
                        })
                    )
                );

                const result = await getWorkspaces();

                expect(result.data?.owned).toHaveLength(1);
                expect(result.data?.member).toHaveLength(0);
            });
        });

        describe("getWorkspace", () => {
            it("returns workspace by ID", async () => {
                const mockWorkspace = { id: "ws-123", name: "Test Workspace" };

                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({
                            workspace: mockWorkspace,
                            role: "owner",
                            isOwner: true
                        })
                    )
                );

                const result = await getWorkspace("ws-123");

                expect(result.success).toBe(true);
                expect(result.data?.workspace.id).toBe("ws-123");
                expect(result.data?.isOwner).toBe(true);
            });

            it("throws error when workspace not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Workspace not found"), false, 404)
                );

                await expect(getWorkspace("nonexistent")).rejects.toThrow("Workspace not found");
            });
        });

        describe("createWorkspace", () => {
            it("creates workspace successfully", async () => {
                const mockWorkspace = { id: "ws-new", name: "New Workspace" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockWorkspace)));

                const result = await createWorkspace({ name: "New Workspace" });

                expect(result.success).toBe(true);
            });

            it("sends workspace data in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ id: "ws-new" })));

                await createWorkspace({ name: "My Workspace", description: "Test workspace" });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("My Workspace");
                expect(body.description).toBe("Test workspace");
            });

            it("throws error on duplicate name", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Workspace name already exists"),
                        false,
                        400
                    )
                );

                await expect(createWorkspace({ name: "Existing" })).rejects.toThrow(
                    "Workspace name already exists"
                );
            });
        });

        describe("updateWorkspace", () => {
            it("updates workspace successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "ws-123", name: "Updated Name" })
                    )
                );

                const result = await updateWorkspace("ws-123", { name: "Updated Name" });

                expect(result.success).toBe(true);
            });

            it("throws error when not owner", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Only workspace owner can update"),
                        false,
                        403
                    )
                );

                await expect(updateWorkspace("ws-123", { name: "New" })).rejects.toThrow(
                    "Only workspace owner can update"
                );
            });
        });

        describe("deleteWorkspace", () => {
            it("deletes workspace successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteWorkspace("ws-123");

                expect(result.success).toBe(true);
            });

            it("throws error when deleting default workspace", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Cannot delete default workspace"),
                        false,
                        400
                    )
                );

                await expect(deleteWorkspace("default-ws")).rejects.toThrow(
                    "Cannot delete default workspace"
                );
            });
        });

        describe("getWorkspaceMembers", () => {
            it("returns list of workspace members", async () => {
                const mockMembers = [
                    { userId: "user-1", role: "owner", email: "owner@example.com" },
                    { userId: "user-2", role: "member", email: "member@example.com" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockMembers)));

                const result = await getWorkspaceMembers("ws-123");

                expect(result.success).toBe(true);
                expect(result.data).toHaveLength(2);
            });

            it("throws error when not a member", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Not a member"), false, 403)
                );

                await expect(getWorkspaceMembers("ws-123")).rejects.toThrow("Not a member");
            });
        });

        describe("inviteWorkspaceMember", () => {
            it("invites member successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({
                            id: "invite-123",
                            email: "new@example.com",
                            role: "member"
                        })
                    )
                );

                const result = await inviteWorkspaceMember("ws-123", {
                    email: "new@example.com",
                    role: "member"
                });

                expect(result.success).toBe(true);
                expect(result.data?.email).toBe("new@example.com");
            });

            it("sends invite data in request body", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "invite-1", email: "test@example.com" })
                    )
                );

                await inviteWorkspaceMember("ws-123", {
                    email: "test@example.com",
                    role: "admin"
                });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.email).toBe("test@example.com");
                expect(body.role).toBe("admin");
            });

            it("throws error when user already a member", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("User is already a member"),
                        false,
                        400
                    )
                );

                await expect(
                    inviteWorkspaceMember("ws-123", {
                        email: "existing@example.com",
                        role: "member"
                    })
                ).rejects.toThrow("User is already a member");
            });

            it("throws error when not authorized to invite", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Not authorized to invite members"),
                        false,
                        403
                    )
                );

                await expect(
                    inviteWorkspaceMember("ws-123", { email: "new@example.com", role: "member" })
                ).rejects.toThrow("Not authorized to invite members");
            });
        });
    });

    // ===== Form Interface API Tests =====
    describe("Form Interface API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getFormInterfaces", () => {
            it("returns list of form interfaces", async () => {
                const mockForms = [
                    { id: "form-1", name: "Contact Form", status: "published" },
                    { id: "form-2", name: "Survey", status: "draft" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ data: mockForms })));

                const result = await getFormInterfaces();

                expect(result.success).toBe(true);
            });

            it("supports pagination params", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true, data: [] }));

                await getFormInterfaces({ offset: 10, limit: 10 });

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("offset=10");
                expect(url).toContain("limit=10");
            });

            it("supports folder filter", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ data: [] })));

                await getFormInterfaces({ folderId: "folder-123" });

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("folderId=folder-123");
            });
        });

        describe("getFormInterface", () => {
            it("returns form interface by ID", async () => {
                const mockForm = { id: "form-123", name: "Test Form" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockForm)));

                const result = await getFormInterface("form-123");

                expect(result.success).toBe(true);
            });

            it("throws error when not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Form not found"), false, 404)
                );

                await expect(getFormInterface("nonexistent")).rejects.toThrow("Form not found");
            });
        });

        describe("createFormInterface", () => {
            it("creates form interface successfully", async () => {
                const mockForm = { id: "form-new", name: "New Form" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockForm)));

                const result = await createFormInterface({
                    name: "New Form",
                    slug: "new-form",
                    title: "New Form",
                    targetType: "agent",
                    agentId: "agent-123"
                });

                expect(result.success).toBe(true);
            });

            it("sends form data in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ id: "form-1" })));

                await createFormInterface({
                    name: "Contact Form",
                    slug: "contact-form",
                    title: "Contact Form",
                    targetType: "agent",
                    agentId: "agent-123",
                    description: "A contact form"
                });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("Contact Form");
                expect(body.agentId).toBe("agent-123");
            });
        });

        describe("updateFormInterface", () => {
            it("updates form interface successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "form-123", name: "Updated" })
                    )
                );

                const result = await updateFormInterface("form-123", { name: "Updated" });

                expect(result.success).toBe(true);
            });
        });

        describe("deleteFormInterface", () => {
            it("deletes form interface successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteFormInterface("form-123");

                expect(result.success).toBe(true);
            });
        });

        describe("publishFormInterface", () => {
            it("publishes form interface", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ status: "published" }))
                );

                const result = await publishFormInterface("form-123");

                expect(result.success).toBe(true);
            });

            it("calls correct endpoint", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ status: "published" }))
                );

                await publishFormInterface("form-123");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("/form-interfaces/form-123/publish");
            });
        });

        describe("unpublishFormInterface", () => {
            it("unpublishes form interface", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ status: "draft" })));

                const result = await unpublishFormInterface("form-123");

                expect(result.success).toBe(true);
            });
        });

        describe("duplicateFormInterface", () => {
            it("duplicates form interface", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "form-copy", name: "Form Copy" })
                    )
                );

                const result = await duplicateFormInterface("form-123");

                expect(result.success).toBe(true);
            });
        });

        describe("getFormInterfaceSubmissions", () => {
            it("returns list of submissions", async () => {
                const mockSubmissions = {
                    items: [
                        { id: "sub-1", data: { name: "John" } },
                        { id: "sub-2", data: { name: "Jane" } }
                    ],
                    total: 2,
                    page: 1,
                    pageSize: 20,
                    hasMore: false
                };

                mockFetchOnce(createMockFetchResponse({ success: true, data: mockSubmissions }));

                const result = await getFormInterfaceSubmissions("form-123");

                expect(result.success).toBe(true);
            });

            it("supports pagination with offset and limit", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true, data: { items: [] } }));

                await getFormInterfaceSubmissions("form-123", { offset: 20, limit: 20 });

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("offset=20");
                expect(url).toContain("limit=20");
            });
        });
    });

    // ===== Chat Interface API Tests =====
    describe("Chat Interface API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getChatInterfaces", () => {
            it("returns list of chat interfaces", async () => {
                const mockChats = [
                    { id: "chat-1", name: "Support Bot", status: "published" },
                    { id: "chat-2", name: "FAQ Bot", status: "draft" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ data: mockChats })));

                const result = await getChatInterfaces();

                expect(result.success).toBe(true);
            });

            it("supports folder filter", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ data: [] })));

                await getChatInterfaces({ folderId: "folder-123" });

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("folderId=folder-123");
            });
        });

        describe("getChatInterface", () => {
            it("returns chat interface by ID", async () => {
                const mockChat = { id: "chat-123", name: "Test Chat" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockChat)));

                const result = await getChatInterface("chat-123");

                expect(result.success).toBe(true);
            });

            it("throws error when not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Chat interface not found"),
                        false,
                        404
                    )
                );

                await expect(getChatInterface("nonexistent")).rejects.toThrow(
                    "Chat interface not found"
                );
            });
        });

        describe("createChatInterface", () => {
            it("creates chat interface successfully", async () => {
                const mockChat = { id: "chat-new", name: "New Chat" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockChat)));

                const result = await createChatInterface({
                    name: "New Chat",
                    slug: "new-chat",
                    title: "New Chat",
                    agentId: "agent-123"
                });

                expect(result.success).toBe(true);
            });
        });

        describe("updateChatInterface", () => {
            it("updates chat interface successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "chat-123", name: "Updated" })
                    )
                );

                const result = await updateChatInterface("chat-123", { name: "Updated" });

                expect(result.success).toBe(true);
            });
        });

        describe("deleteChatInterface", () => {
            it("deletes chat interface successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await deleteChatInterface("chat-123");

                expect(result.success).toBe(true);
            });
        });

        describe("publishChatInterface", () => {
            it("publishes chat interface", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ status: "published" }))
                );

                const result = await publishChatInterface("chat-123");

                expect(result.success).toBe(true);
            });
        });

        describe("unpublishChatInterface", () => {
            it("unpublishes chat interface", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ status: "draft" })));

                const result = await unpublishChatInterface("chat-123");

                expect(result.success).toBe(true);
            });
        });

        describe("duplicateChatInterface", () => {
            it("duplicates chat interface", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ id: "chat-copy" })));

                const result = await duplicateChatInterface("chat-123");

                expect(result.success).toBe(true);
            });
        });

        describe("getChatInterfaceSessions", () => {
            it("returns list of sessions", async () => {
                const mockSessions = [
                    { id: "session-1", messageCount: 10 },
                    { id: "session-2", messageCount: 5 }
                ];

                mockFetchOnce(
                    createMockFetchResponse(createMockApiResponse({ data: mockSessions }))
                );

                const result = await getChatInterfaceSessions("chat-123");

                expect(result.success).toBe(true);
            });
        });
    });

    // ===== API Key API Tests =====
    describe("API Key API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getApiKeys", () => {
            it("returns list of API keys", async () => {
                const mockKeys = [
                    { id: "key-1", name: "Production", prefix: "fm_prod_" },
                    { id: "key-2", name: "Development", prefix: "fm_dev_" }
                ];

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKeys)));

                const result = await getApiKeys();

                expect(result.success).toBe(true);
                expect(result.data).toHaveLength(2);
            });
        });

        describe("getApiKey", () => {
            it("returns API key by ID", async () => {
                const mockKey = { id: "key-123", name: "Test Key" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKey)));

                const result = await getApiKey("key-123");

                expect(result.success).toBe(true);
            });

            it("throws error when not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("API key not found"), false, 404)
                );

                await expect(getApiKey("nonexistent")).rejects.toThrow("API key not found");
            });
        });

        describe("createApiKey", () => {
            it("creates API key successfully", async () => {
                const mockKey = { id: "key-new", name: "New Key", key: "fm_xxx_full_key" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKey)));

                const result = await createApiKey({
                    name: "New Key",
                    scopes: ["workflows:read", "workflows:execute"]
                });

                expect(result.success).toBe(true);
            });

            it("sends key data in request body", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ id: "key-1" })));

                await createApiKey({
                    name: "Production Key",
                    scopes: ["workflows:read"],
                    expires_in_days: 365
                });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("Production Key");
                expect(body.scopes).toContain("workflows:read");
            });
        });

        describe("updateApiKey", () => {
            it("updates API key successfully", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiResponse({ id: "key-123", name: "Updated" })
                    )
                );

                const result = await updateApiKey("key-123", { name: "Updated" });

                expect(result.success).toBe(true);
            });
        });

        describe("rotateApiKey", () => {
            it("rotates API key and returns new key", async () => {
                const mockKey = { id: "key-123", key: "fm_xxx_new_key" };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockKey)));

                const result = await rotateApiKey("key-123");

                expect(result.success).toBe(true);
            });

            it("calls correct endpoint with POST", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse({ id: "key-123" })));

                await rotateApiKey("key-123");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                expect(fetchCall[1]?.method).toBe("POST");
                expect(fetchCall[0]).toContain("/api-keys/key-123/rotate");
            });
        });

        describe("revokeApiKey", () => {
            it("revokes API key successfully", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                const result = await revokeApiKey("key-123");

                expect(result.success).toBe(true);
            });

            it("calls correct endpoint with DELETE", async () => {
                mockFetchOnce(createMockFetchResponse(createMockApiResponse(null)));

                await revokeApiKey("key-123");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                expect(fetchCall[1]?.method).toBe("DELETE");
            });
        });
    });

    // ===== Execution API Tests =====
    describe("Execution API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("getExecutions", () => {
            it("returns list of executions", async () => {
                const mockExecutions = [
                    { id: "exec-1", status: "completed", workflowId: "wf-1" },
                    { id: "exec-2", status: "running", workflowId: "wf-1" }
                ];

                mockFetchOnce(createMockFetchResponse({ success: true, data: mockExecutions }));

                const result = await getExecutions();

                expect(result.success).toBe(true);
            });

            it("supports workflow filter", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true, data: [] }));

                await getExecutions("wf-123");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("workflowId=wf-123");
            });

            it("supports status filter", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true, data: [] }));

                await getExecutions(undefined, { status: "completed" });

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("status=completed");
            });

            it("supports pagination with offset and limit", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true, data: [] }));

                await getExecutions(undefined, { offset: 20, limit: 50 });

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("offset=20");
                expect(url).toContain("limit=50");
            });
        });

        describe("getExecution", () => {
            it("returns execution by ID", async () => {
                const mockExecution = {
                    id: "exec-123",
                    status: "completed",
                    outputs: { result: "success" }
                };

                mockFetchOnce(createMockFetchResponse(createMockApiResponse(mockExecution)));

                const result = await getExecution("exec-123");

                expect(result.success).toBe(true);
            });

            it("throws error when not found", async () => {
                mockFetchOnce(
                    createMockFetchResponse(createMockApiError("Execution not found"), false, 404)
                );

                await expect(getExecution("nonexistent")).rejects.toThrow("Execution not found");
            });
        });

        describe("submitUserResponse", () => {
            it("submits user response to paused execution", async () => {
                mockFetchOnce(
                    createMockFetchResponse({ success: true, data: { status: "running" } })
                );

                const result = await submitUserResponse("exec-123", "Hello");

                expect(result.success).toBe(true);
            });

            it("sends response data in request body", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await submitUserResponse("exec-123", { answer: "Yes", confirmed: true });

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.response.answer).toBe("Yes");
                expect(body.response.confirmed).toBe(true);
            });

            it("calls correct endpoint", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await submitUserResponse("exec-456", "response");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("/executions/exec-456/submit-response");
            });

            it("throws error when execution not paused", async () => {
                mockFetchOnce(
                    createMockFetchResponse(
                        createMockApiError("Execution is not waiting for input"),
                        false,
                        400
                    )
                );

                await expect(submitUserResponse("exec-123", "value")).rejects.toThrow(
                    "Execution is not waiting for input"
                );
            });
        });
    });

    // ===== Checkpoint API Tests =====
    describe("Checkpoint API", () => {
        beforeEach(() => {
            localStorage.setItem("auth_token", createMockAuthToken());
        });

        describe("listCheckpoints", () => {
            it("returns list of checkpoints for workflow", async () => {
                const mockCheckpoints = [
                    { id: "cp-1", name: "Before refactor", created_at: "2024-01-01", snapshot: {} },
                    { id: "cp-2", name: "After feature", created_at: "2024-01-02", snapshot: {} }
                ];

                mockFetchOnce(createMockFetchResponse({ data: mockCheckpoints }));

                const result = await listCheckpoints("wf-123");

                expect(result).toHaveLength(2);
            });

            it("includes workflowId in URL", async () => {
                mockFetchOnce(createMockFetchResponse({ data: [] }));

                await listCheckpoints("wf-456");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("/checkpoints/workflow/wf-456");
            });
        });

        describe("createCheckpoint", () => {
            it("creates checkpoint successfully", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                const result = await createCheckpoint("wf-123", "My Checkpoint");

                expect(result.success).toBe(true);
            });

            it("creates checkpoint with auto-generated name", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await createCheckpoint("wf-123");

                // Should not throw even without name
                expect(fetch).toHaveBeenCalled();
            });

            it("calls correct endpoint", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await createCheckpoint("wf-123", "Test");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("/checkpoints/wf-123");
            });
        });

        describe("restoreCheckpoint", () => {
            it("restores checkpoint successfully", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                const result = await restoreCheckpoint("cp-123");

                expect(result.success).toBe(true);
            });

            it("calls correct endpoint with POST", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await restoreCheckpoint("cp-123");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                expect(fetchCall[1]?.method).toBe("POST");
                expect(fetchCall[0]).toContain("/checkpoints/restore/cp-123");
            });
        });

        describe("deleteCheckpoint", () => {
            it("deletes checkpoint and returns remaining checkpoints", async () => {
                // First call: delete checkpoint
                mockFetchOnce(createMockFetchResponse({ success: true }));
                // Second call: listCheckpoints is called after delete
                mockFetchOnce(createMockFetchResponse({ data: [] }));

                const result = await deleteCheckpoint("cp-123", "wf-123");

                // deleteCheckpoint returns the updated list of checkpoints
                expect(result).toEqual([]);
            });

            it("uses checkpointId in URL", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));
                mockFetchOnce(createMockFetchResponse({ data: [] }));

                await deleteCheckpoint("cp-789", "wf-456");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("/checkpoints/cp-789");
            });
        });

        describe("renameCheckpoint", () => {
            it("renames checkpoint successfully", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                const result = await renameCheckpoint("cp-123", "New Name");

                expect(result.success).toBe(true);
            });

            it("sends new name in request body", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await renameCheckpoint("cp-123", "Better Name");

                const fetchCall = vi.mocked(fetch).mock.calls[0];
                const body = JSON.parse(fetchCall[1]?.body as string);
                expect(body.name).toBe("Better Name");
            });

            it("calls correct endpoint", async () => {
                mockFetchOnce(createMockFetchResponse({ success: true }));

                await renameCheckpoint("cp-123", "New Name");

                const url = vi.mocked(fetch).mock.calls[0][0] as string;
                expect(url).toContain("/checkpoints/rename/cp-123");
            });
        });
    });
});
