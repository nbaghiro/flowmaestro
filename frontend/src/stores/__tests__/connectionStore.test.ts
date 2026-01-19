/**
 * Connection Store Tests
 *
 * Tests for connection state management including CRUD operations
 * and filtering by provider/method.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the API module
vi.mock("../../lib/api", () => ({
    getConnections: vi.fn(),
    createConnection: vi.fn(),
    updateConnection: vi.fn(),
    deleteConnection: vi.fn()
}));

import {
    getConnections,
    createConnection,
    updateConnection,
    deleteConnection
} from "../../lib/api";
import { useConnectionStore } from "../connectionStore";

// Mock connection data factory
function createMockConnection(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "conn-123",
        name: "Test Connection",
        provider: "openai",
        connection_method: "api_key" as const,
        status: "active" as const,
        credentials: { api_key: "sk-***" },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return { ...defaults, ...overrides };
}

// Reset store before each test
function resetStore() {
    useConnectionStore.setState({
        connections: [],
        loading: false,
        error: null
    });
}

describe("connectionStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useConnectionStore.getState();

            expect(state.connections).toEqual([]);
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ===== Fetch Connections =====
    describe("fetchConnections", () => {
        it("fetches connections successfully", async () => {
            const mockConnections = [
                createMockConnection({ id: "conn-1" }),
                createMockConnection({ id: "conn-2" })
            ];

            vi.mocked(getConnections).mockResolvedValue({
                success: true,
                data: mockConnections
            });

            await useConnectionStore.getState().fetchConnections();

            const state = useConnectionStore.getState();
            expect(state.connections).toHaveLength(2);
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });

        it("sets loading state during fetch", async () => {
            vi.mocked(getConnections).mockImplementation(async () => {
                expect(useConnectionStore.getState().loading).toBe(true);
                return { success: true, data: [] };
            });

            await useConnectionStore.getState().fetchConnections();
        });

        it("passes filter params to API", async () => {
            vi.mocked(getConnections).mockResolvedValue({
                success: true,
                data: []
            });

            await useConnectionStore.getState().fetchConnections({
                provider: "anthropic",
                connection_method: "oauth",
                status: "active"
            });

            expect(getConnections).toHaveBeenCalledWith({
                provider: "anthropic",
                connection_method: "oauth",
                status: "active"
            });
        });

        it("handles fetch error", async () => {
            vi.mocked(getConnections).mockRejectedValue(new Error("Network error"));

            await useConnectionStore.getState().fetchConnections();

            const state = useConnectionStore.getState();
            expect(state.connections).toEqual([]);
            expect(state.loading).toBe(false);
            expect(state.error).toBe("Network error");
        });

        it("handles non-Error thrown values", async () => {
            vi.mocked(getConnections).mockRejectedValue("Unknown error");

            await useConnectionStore.getState().fetchConnections();

            const state = useConnectionStore.getState();
            expect(state.error).toBe("Failed to fetch connections");
        });
    });

    // ===== Add Connection =====
    describe("addConnection", () => {
        it("adds connection successfully", async () => {
            const newConnection = createMockConnection();

            vi.mocked(createConnection).mockResolvedValue({
                success: true,
                data: newConnection
            });

            const result = await useConnectionStore.getState().addConnection({
                name: "Test Connection",
                provider: "openai",
                connection_method: "api_key",
                credentials: { api_key: "sk-test" }
            });

            const state = useConnectionStore.getState();
            expect(state.connections).toHaveLength(1);
            expect(state.connections[0].id).toBe("conn-123");
            expect(result).toEqual(newConnection);
        });

        it("appends to existing connections", async () => {
            useConnectionStore.setState({
                connections: [createMockConnection({ id: "existing" })]
            });

            const newConnection = createMockConnection({ id: "new-conn" });
            vi.mocked(createConnection).mockResolvedValue({
                success: true,
                data: newConnection
            });

            await useConnectionStore.getState().addConnection({
                name: "New Connection",
                provider: "anthropic",
                connection_method: "api_key",
                credentials: {}
            });

            const state = useConnectionStore.getState();
            expect(state.connections).toHaveLength(2);
            expect(state.connections[0].id).toBe("existing");
            expect(state.connections[1].id).toBe("new-conn");
        });

        it("throws on failed response", async () => {
            vi.mocked(createConnection).mockResolvedValue({
                success: false
            });

            await expect(
                useConnectionStore.getState().addConnection({
                    name: "Test",
                    provider: "openai",
                    connection_method: "api_key",
                    credentials: {}
                })
            ).rejects.toThrow("Failed to create connection");
        });

        it("handles API error", async () => {
            vi.mocked(createConnection).mockRejectedValue(new Error("API Error"));

            await expect(
                useConnectionStore.getState().addConnection({
                    name: "Test",
                    provider: "openai",
                    connection_method: "api_key",
                    credentials: {}
                })
            ).rejects.toThrow("API Error");

            const state = useConnectionStore.getState();
            expect(state.error).toBe("API Error");
            expect(state.loading).toBe(false);
        });
    });

    // ===== Update Connection =====
    describe("updateConnectionById", () => {
        it("updates connection successfully", async () => {
            const existingConnection = createMockConnection({ name: "Original" });
            useConnectionStore.setState({
                connections: [existingConnection]
            });

            const updatedConnection = createMockConnection({ name: "Updated" });
            vi.mocked(updateConnection).mockResolvedValue({
                success: true,
                data: updatedConnection
            });

            await useConnectionStore.getState().updateConnectionById("conn-123", {
                name: "Updated"
            });

            const state = useConnectionStore.getState();
            expect(state.connections[0].name).toBe("Updated");
            expect(state.loading).toBe(false);
        });

        it("only updates matching connection", async () => {
            useConnectionStore.setState({
                connections: [
                    createMockConnection({ id: "conn-1", name: "First" }),
                    createMockConnection({ id: "conn-2", name: "Second" })
                ]
            });

            vi.mocked(updateConnection).mockResolvedValue({
                success: true,
                data: createMockConnection({ id: "conn-1", name: "Updated First" })
            });

            await useConnectionStore.getState().updateConnectionById("conn-1", {
                name: "Updated First"
            });

            const state = useConnectionStore.getState();
            expect(state.connections[0].name).toBe("Updated First");
            expect(state.connections[1].name).toBe("Second");
        });

        it("handles update error", async () => {
            useConnectionStore.setState({
                connections: [createMockConnection()]
            });

            vi.mocked(updateConnection).mockRejectedValue(new Error("Update failed"));

            await expect(
                useConnectionStore.getState().updateConnectionById("conn-123", {
                    name: "Updated"
                })
            ).rejects.toThrow("Update failed");

            const state = useConnectionStore.getState();
            expect(state.error).toBe("Update failed");
        });
    });

    // ===== Delete Connection =====
    describe("deleteConnectionById", () => {
        it("deletes connection successfully", async () => {
            useConnectionStore.setState({
                connections: [
                    createMockConnection({ id: "conn-1" }),
                    createMockConnection({ id: "conn-2" })
                ]
            });

            vi.mocked(deleteConnection).mockResolvedValue({
                success: true
            });

            await useConnectionStore.getState().deleteConnectionById("conn-1");

            const state = useConnectionStore.getState();
            expect(state.connections).toHaveLength(1);
            expect(state.connections[0].id).toBe("conn-2");
        });

        it("handles delete error", async () => {
            useConnectionStore.setState({
                connections: [createMockConnection()]
            });

            vi.mocked(deleteConnection).mockRejectedValue(new Error("Delete failed"));

            await expect(
                useConnectionStore.getState().deleteConnectionById("conn-123")
            ).rejects.toThrow("Delete failed");

            const state = useConnectionStore.getState();
            expect(state.error).toBe("Delete failed");
            expect(state.connections).toHaveLength(1); // Not removed
        });
    });

    // ===== Filter Methods =====
    describe("getByProvider", () => {
        it("returns connections matching provider", () => {
            useConnectionStore.setState({
                connections: [
                    createMockConnection({ id: "conn-1", provider: "openai" }),
                    createMockConnection({ id: "conn-2", provider: "anthropic" }),
                    createMockConnection({ id: "conn-3", provider: "openai" })
                ]
            });

            const result = useConnectionStore.getState().getByProvider("openai");

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("conn-1");
            expect(result[1].id).toBe("conn-3");
        });

        it("returns empty array when no matches", () => {
            useConnectionStore.setState({
                connections: [createMockConnection({ provider: "openai" })]
            });

            const result = useConnectionStore.getState().getByProvider("anthropic");

            expect(result).toEqual([]);
        });
    });

    describe("getByMethod", () => {
        it("returns connections matching method", () => {
            useConnectionStore.setState({
                connections: [
                    createMockConnection({ id: "conn-1", connection_method: "api_key" }),
                    createMockConnection({ id: "conn-2", connection_method: "oauth" }),
                    createMockConnection({ id: "conn-3", connection_method: "api_key" })
                ]
            });

            const result = useConnectionStore.getState().getByMethod("api_key");

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("conn-1");
            expect(result[1].id).toBe("conn-3");
        });

        it("returns empty array when no matches", () => {
            useConnectionStore.setState({
                connections: [createMockConnection({ connection_method: "api_key" })]
            });

            const result = useConnectionStore.getState().getByMethod("oauth");

            expect(result).toEqual([]);
        });
    });

    // ===== Clear Error =====
    describe("clearError", () => {
        it("clears error state", () => {
            useConnectionStore.setState({ error: "Some error" });

            useConnectionStore.getState().clearError();

            expect(useConnectionStore.getState().error).toBeNull();
        });
    });
});
