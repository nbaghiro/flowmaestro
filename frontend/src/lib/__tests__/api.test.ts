/**
 * API Client Tests
 *
 * Tests for core API functions: authentication, workflows, and request handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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
    resetPassword
} from "../api";
import {
    createMockFetchResponse,
    createMockApiResponse,
    createMockApiError,
    createMockUser,
    createMockAuthToken,
    mockFetchOnce
} from "./test-helpers";

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
});
