/**
 * Test helpers for frontend tests
 */

import { vi } from "vitest";
import type { ApiUser } from "../api";

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse<T>(data: T, ok = true, status = 200): Response {
    return {
        ok,
        status,
        statusText: ok ? "OK" : "Error",
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        headers: new Headers({
            "Content-Type": "application/json"
        }),
        clone: () => createMockFetchResponse(data, ok, status),
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData()),
        redirected: false,
        type: "basic" as ResponseType,
        url: ""
    } as Response;
}

/**
 * Create a mock API success response
 */
export function createMockApiResponse<T>(data: T) {
    return {
        success: true,
        data
    };
}

/**
 * Create a mock API error response
 */
export function createMockApiError(error: string) {
    return {
        success: false,
        error
    };
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides?: Partial<ApiUser>): ApiUser {
    return {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        avatar_url: undefined,
        google_id: null,
        microsoft_id: null,
        has_password: true,
        email_verified: true,
        two_factor_enabled: false,
        two_factor_phone: null,
        two_factor_phone_verified: false,
        ...overrides
    };
}

/**
 * Create a mock workspace object
 */
export function createMockWorkspace(overrides?: Record<string, unknown>) {
    return {
        id: "workspace-123",
        name: "Test Workspace",
        description: "A test workspace",
        ownerId: "user-123",
        type: "free" as const,
        category: "personal" as const,
        maxWorkflows: 10,
        maxAgents: 5,
        maxKnowledgeBases: 3,
        maxKbChunks: 10000,
        maxMembers: 1,
        maxConnections: 5,
        executionHistoryDays: 7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        workflowCount: 0,
        agentCount: 0,
        memberCount: 1,
        ...overrides
    };
}

/**
 * Create a mock auth token
 */
export function createMockAuthToken(): string {
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.mock-signature";
}

/**
 * Setup mock fetch to return specific responses
 */
export function mockFetch(responses: Map<string, Response | (() => Response)>) {
    return vi.fn((url: string, _options?: RequestInit) => {
        const urlPath = new URL(url, "http://localhost:3001").pathname;
        const response = responses.get(urlPath);

        if (response) {
            return Promise.resolve(typeof response === "function" ? response() : response);
        }

        return Promise.resolve(
            createMockFetchResponse({ success: false, error: "Not found" }, false, 404)
        );
    });
}

/**
 * Setup a single mock fetch response for all calls
 */
export function mockFetchOnce(response: Response) {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

/**
 * Setup mock fetch to fail with an error
 */
export function mockFetchError(error: Error | string) {
    const err = typeof error === "string" ? new Error(error) : error;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
}

/**
 * Create mock workflow nodes
 */
export function createMockWorkflowNode(overrides?: Record<string, unknown>) {
    return {
        id: "node-1",
        type: "llm",
        position: { x: 100, y: 100 },
        data: {
            label: "Test Node",
            config: {}
        },
        ...overrides
    };
}

/**
 * Create mock workflow edges
 */
export function createMockWorkflowEdge(overrides?: Record<string, unknown>) {
    return {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        ...overrides
    };
}

/**
 * Wait for next tick (useful for async state updates)
 */
export function nextTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Wait for a specific number of milliseconds
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a mock execution stream event
 */
export function createMockStreamEvent(type: string, data: Record<string, unknown>, sequence = 1) {
    return {
        type,
        timestamp: Date.now(),
        executionId: "exec-123",
        sequence,
        data
    };
}

/**
 * Reset all stores to initial state
 */
export async function resetStores() {
    // Import stores dynamically to avoid circular dependencies
    const { useAuthStore } = await import("../../stores/authStore");
    const { useWorkflowStore } = await import("../../stores/workflowStore");
    const { useWorkspaceStore } = await import("../../stores/workspaceStore");

    // Reset to initial state
    useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        isInitialized: false
    });

    useWorkflowStore.setState({
        nodes: [],
        edges: [],
        selectedNode: null,
        aiGenerated: false,
        aiPrompt: null,
        isExecuting: false,
        executionResult: null,
        executionError: null,
        currentExecution: null,
        nodeValidation: {}
    });

    useWorkspaceStore.setState({
        ownedWorkspaces: [],
        memberWorkspaces: [],
        currentWorkspace: null,
        currentRole: null,
        isOwner: false,
        members: [],
        membersLoading: false,
        creditBalance: null,
        creditsLoading: false,
        isLoading: false,
        isInitialized: false,
        error: null
    });
}
