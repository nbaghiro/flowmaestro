/**
 * Persona Store Tests
 *
 * Tests for persona state management including:
 * - Persona definitions (categories, individual personas)
 * - Persona instances (CRUD, messaging, lifecycle)
 * - Custom avatars
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PersonaCategory } from "@flowmaestro/shared";
import * as api from "../../lib/api";
import { usePersonaStore } from "../personaStore";

// Mock the api module (vi.mock is hoisted by Vitest)
vi.mock("../../lib/api", () => ({
    getPersonasByCategory: vi.fn(),
    getPersona: vi.fn(),
    getPersonaInstancesDashboard: vi.fn(),
    getPersonaInstances: vi.fn(),
    getPersonaInstance: vi.fn(),
    getPersonaInstancesCount: vi.fn(),
    createPersonaInstance: vi.fn(),
    sendPersonaInstanceMessage: vi.fn(),
    cancelPersonaInstance: vi.fn(),
    completePersonaInstance: vi.fn(),
    deletePersonaInstance: vi.fn()
}));

// Mock logger to avoid console output in tests
vi.mock("../../lib/logger", () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn()
    }
}));

// ============================================================================
// TEST HELPERS - Use 'unknown' casts to avoid strict type checking on mocks
// ============================================================================

function createMockPersonaSummary(overrides?: Record<string, unknown>) {
    return {
        id: "persona-123",
        name: "Test Persona",
        slug: "test-persona",
        title: "Test Persona Title",
        description: "A test persona",
        avatar_url: "https://example.com/avatar.png",
        short_description: "A test persona for unit tests",
        category: "research" as PersonaCategory,
        tags: [],
        specialty: "Testing",
        expertise_areas: [],
        example_tasks: [],
        input_fields: [],
        deliverables: [],
        estimated_duration: { min_hours: 1, max_hours: 2 },
        estimated_cost_credits: 10,
        typical_deliverables: [],
        default_tools: [],
        connection_requirements: [],
        featured: false,
        status: "active",
        ...overrides
    };
}

function createMockPersonaDefinition(overrides?: Record<string, unknown>) {
    return {
        ...createMockPersonaSummary(overrides),
        long_description: "A detailed description of the test persona",
        capabilities: ["Research", "Analysis"],
        example_prompts: ["Help me research...", "Analyze this..."],
        system_prompt: "You are a helpful research assistant.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

function createMockPersonaInstance(overrides?: Record<string, unknown>) {
    return {
        id: "instance-123",
        persona_definition_id: "persona-123",
        user_id: "user-123",
        workspace_id: "workspace-123",
        name: "My Research Project",
        task_title: "Research Task",
        task_description: "A research task",
        status: "running" as const,
        input_context: "Research context",
        additional_context: null,
        structured_inputs: {},
        progress: 0,
        progress_message: null,
        deliverables: [],
        summary: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        temporal_workflow_id: null,
        message_count: 0,
        total_cost_credits: 0,
        model_costs: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        persona: {
            name: "Test Persona",
            slug: "test-persona",
            avatar_url: "https://example.com/avatar.png",
            category: "research" as PersonaCategory
        },
        ...overrides
    };
}

function createMockInstanceSummary(overrides?: Record<string, unknown>) {
    return {
        id: "instance-123",
        persona_definition_id: "persona-123",
        name: "My Research Project",
        task_title: "Research Task",
        task_description: "A research task",
        status: "running" as const,
        progress: 0,
        progress_message: null,
        error_message: null,
        started_at: null,
        completed_at: null,
        message_count: 0,
        total_cost_credits: 0,
        persona_name: "Test Persona",
        persona_slug: "test-persona",
        persona_avatar_url: "https://example.com/avatar.png",
        persona_category: "research" as PersonaCategory,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    };
}

function createMockDashboard() {
    return {
        running: [createMockInstanceSummary({ status: "running" })],
        waiting_for_input: [
            createMockInstanceSummary({ id: "instance-456", status: "waiting_for_input" })
        ],
        recent_completed: [createMockInstanceSummary({ id: "instance-789", status: "completed" })],
        needs_attention: [
            createMockInstanceSummary({ id: "instance-456", status: "waiting_for_input" })
        ]
    };
}

function createEmptyPersonasByCategory() {
    return {
        research: [],
        content: [],
        development: [],
        data: [],
        operations: [],
        business: [],
        proposals: []
    };
}

function resetStore() {
    usePersonaStore.setState({
        personasByCategory: createEmptyPersonasByCategory(),
        currentPersona: null,
        isLoadingPersonas: false,
        personasError: null,
        customAvatars: {},
        dashboard: null,
        instances: [],
        currentInstance: null,
        instancesTotal: 0,
        needsAttentionCount: 0,
        isLoadingInstances: false,
        instancesError: null
    });
}

// ============================================================================
// TESTS
// ============================================================================

describe("personaStore", () => {
    beforeEach(() => {
        resetStore();
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = usePersonaStore.getState();

            expect(state.personasByCategory).toEqual(createEmptyPersonasByCategory());
            expect(state.currentPersona).toBeNull();
            expect(state.isLoadingPersonas).toBe(false);
            expect(state.personasError).toBeNull();
            expect(state.dashboard).toBeNull();
            expect(state.instances).toEqual([]);
            expect(state.currentInstance).toBeNull();
            expect(state.instancesTotal).toBe(0);
            expect(state.needsAttentionCount).toBe(0);
            expect(state.isLoadingInstances).toBe(false);
            expect(state.instancesError).toBeNull();
        });
    });

    // ===== Persona Definitions =====
    describe("persona definitions", () => {
        describe("fetchPersonasByCategory", () => {
            it("fetches and stores personas by category", async () => {
                const mockData = {
                    ...createEmptyPersonasByCategory(),
                    research: [createMockPersonaSummary({ category: "research" })],
                    content: [createMockPersonaSummary({ id: "p2", category: "content" })]
                };

                vi.mocked(api.getPersonasByCategory).mockResolvedValueOnce({
                    success: true,
                    data: mockData
                } as never);

                await usePersonaStore.getState().fetchPersonasByCategory();

                const state = usePersonaStore.getState();
                expect(state.personasByCategory.research).toHaveLength(1);
                expect(state.personasByCategory.content).toHaveLength(1);
                expect(state.isLoadingPersonas).toBe(false);
                expect(state.personasError).toBeNull();
            });

            it("sets loading state during fetch", async () => {
                let resolvePromise: (value: unknown) => void;
                const promise = new Promise((resolve) => {
                    resolvePromise = resolve;
                });

                vi.mocked(api.getPersonasByCategory).mockReturnValueOnce(promise as never);

                const fetchPromise = usePersonaStore.getState().fetchPersonasByCategory();

                expect(usePersonaStore.getState().isLoadingPersonas).toBe(true);

                resolvePromise!({ success: true, data: createEmptyPersonasByCategory() });
                await fetchPromise;

                expect(usePersonaStore.getState().isLoadingPersonas).toBe(false);
            });

            it("handles fetch error", async () => {
                vi.mocked(api.getPersonasByCategory).mockRejectedValueOnce(
                    new Error("Network error")
                );

                await usePersonaStore.getState().fetchPersonasByCategory();

                const state = usePersonaStore.getState();
                expect(state.personasError).toBe("Network error");
                expect(state.isLoadingPersonas).toBe(false);
            });
        });

        describe("fetchPersona", () => {
            it("fetches and stores single persona", async () => {
                const mockPersona = createMockPersonaDefinition();

                vi.mocked(api.getPersona).mockResolvedValueOnce({
                    success: true,
                    data: mockPersona
                } as never);

                await usePersonaStore.getState().fetchPersona("test-persona");

                const state = usePersonaStore.getState();
                expect(state.currentPersona).toEqual(mockPersona);
                expect(state.isLoadingPersonas).toBe(false);
            });

            it("handles fetch error", async () => {
                vi.mocked(api.getPersona).mockRejectedValueOnce(new Error("Not found"));

                await usePersonaStore.getState().fetchPersona("invalid-slug");

                const state = usePersonaStore.getState();
                expect(state.personasError).toBe("Not found");
                expect(state.currentPersona).toBeNull();
            });
        });

        describe("setCurrentPersona", () => {
            it("sets current persona", () => {
                const persona = createMockPersonaDefinition();

                usePersonaStore.getState().setCurrentPersona(persona as never);

                expect(usePersonaStore.getState().currentPersona).toEqual(persona);
            });

            it("clears current persona when passed null", () => {
                usePersonaStore.setState({
                    currentPersona: createMockPersonaDefinition() as never
                });

                usePersonaStore.getState().setCurrentPersona(null);

                expect(usePersonaStore.getState().currentPersona).toBeNull();
            });
        });

        describe("clearPersonasError", () => {
            it("clears personas error", () => {
                usePersonaStore.setState({ personasError: "Some error" });

                usePersonaStore.getState().clearPersonasError();

                expect(usePersonaStore.getState().personasError).toBeNull();
            });
        });
    });

    // ===== Custom Avatars =====
    describe("custom avatars", () => {
        describe("setCustomAvatar", () => {
            it("sets custom avatar and saves to localStorage", () => {
                usePersonaStore
                    .getState()
                    .setCustomAvatar("persona-123", "https://custom.com/avatar.png");

                const state = usePersonaStore.getState();
                expect(state.customAvatars["persona-123"]).toBe("https://custom.com/avatar.png");

                const stored = JSON.parse(
                    localStorage.getItem("flowmaestro-custom-avatars") || "{}"
                );
                expect(stored["persona-123"]).toBe("https://custom.com/avatar.png");
            });

            it("updates existing custom avatar", () => {
                usePersonaStore
                    .getState()
                    .setCustomAvatar("persona-123", "https://old.com/avatar.png");
                usePersonaStore
                    .getState()
                    .setCustomAvatar("persona-123", "https://new.com/avatar.png");

                expect(usePersonaStore.getState().customAvatars["persona-123"]).toBe(
                    "https://new.com/avatar.png"
                );
            });
        });

        describe("getCustomAvatar", () => {
            it("returns custom avatar if set", () => {
                usePersonaStore.setState({
                    customAvatars: { "persona-123": "https://custom.com/avatar.png" }
                });

                const avatar = usePersonaStore.getState().getCustomAvatar("persona-123");

                expect(avatar).toBe("https://custom.com/avatar.png");
            });

            it("returns null if no custom avatar", () => {
                const avatar = usePersonaStore.getState().getCustomAvatar("persona-123");

                expect(avatar).toBeNull();
            });
        });

        describe("clearCustomAvatar", () => {
            it("removes custom avatar", () => {
                usePersonaStore.setState({
                    customAvatars: { "persona-123": "https://custom.com/avatar.png" }
                });

                usePersonaStore.getState().clearCustomAvatar("persona-123");

                expect(usePersonaStore.getState().customAvatars["persona-123"]).toBeUndefined();
            });
        });
    });

    // ===== Persona Instances =====
    describe("persona instances", () => {
        describe("fetchDashboard", () => {
            it("fetches and stores dashboard data", async () => {
                const mockDashboard = createMockDashboard();

                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValueOnce({
                    success: true,
                    data: mockDashboard
                } as never);

                await usePersonaStore.getState().fetchDashboard();

                const state = usePersonaStore.getState();
                expect(state.dashboard).toEqual(mockDashboard);
                expect(state.isLoadingInstances).toBe(false);
            });

            it("handles fetch error", async () => {
                vi.mocked(api.getPersonaInstancesDashboard).mockRejectedValueOnce(
                    new Error("Failed to load")
                );

                await usePersonaStore.getState().fetchDashboard();

                const state = usePersonaStore.getState();
                expect(state.instancesError).toBe("Failed to load");
                expect(state.isLoadingInstances).toBe(false);
            });
        });

        describe("fetchInstances", () => {
            it("fetches instances with parameters", async () => {
                const mockInstances = [
                    createMockInstanceSummary({ id: "i1" }),
                    createMockInstanceSummary({ id: "i2" })
                ];

                vi.mocked(api.getPersonaInstances).mockResolvedValueOnce({
                    success: true,
                    data: { instances: mockInstances, total: 2 }
                } as never);

                await usePersonaStore.getState().fetchInstances({ status: "running", limit: 10 });

                const state = usePersonaStore.getState();
                expect(state.instances).toHaveLength(2);
                expect(state.instancesTotal).toBe(2);

                expect(api.getPersonaInstances).toHaveBeenCalledWith({
                    status: "running",
                    limit: 10
                });
            });

            it("resets instances on error", async () => {
                usePersonaStore.setState({
                    instances: [createMockInstanceSummary() as never],
                    instancesTotal: 1
                });

                vi.mocked(api.getPersonaInstances).mockRejectedValueOnce(new Error("Failed"));

                await usePersonaStore.getState().fetchInstances();

                const state = usePersonaStore.getState();
                expect(state.instances).toEqual([]);
                expect(state.instancesTotal).toBe(0);
            });
        });

        describe("fetchInstance", () => {
            it("fetches single instance", async () => {
                const mockInstance = createMockPersonaInstance();

                vi.mocked(api.getPersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: mockInstance
                } as never);

                await usePersonaStore.getState().fetchInstance("instance-123");

                expect(usePersonaStore.getState().currentInstance).toEqual(mockInstance);
            });
        });

        describe("fetchNeedsAttentionCount", () => {
            it("fetches and stores count", async () => {
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValueOnce({
                    success: true,
                    data: { count: 5 }
                } as never);

                await usePersonaStore.getState().fetchNeedsAttentionCount();

                expect(usePersonaStore.getState().needsAttentionCount).toBe(5);
            });

            it("silently handles error without setting error state", async () => {
                vi.mocked(api.getPersonaInstancesCount).mockRejectedValueOnce(new Error("Failed"));

                await usePersonaStore.getState().fetchNeedsAttentionCount();

                // Should not set error state for badge count failure
                expect(usePersonaStore.getState().instancesError).toBeNull();
            });
        });

        describe("createInstance", () => {
            it("creates instance and refreshes dashboard", async () => {
                const mockInstance = createMockPersonaInstance();
                const mockDashboard = createMockDashboard();

                vi.mocked(api.createPersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: mockInstance
                } as never);
                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValue({
                    success: true,
                    data: mockDashboard
                } as never);
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValue({
                    success: true,
                    data: { count: 1 }
                } as never);

                const result = await usePersonaStore.getState().createInstance({
                    persona_slug: "test-persona",
                    task_title: "New Task",
                    task_description: "Description"
                });

                expect(result).toEqual(mockInstance);
                expect(api.createPersonaInstance).toHaveBeenCalled();
            });

            it("throws error on failure", async () => {
                vi.mocked(api.createPersonaInstance).mockRejectedValueOnce(
                    new Error("Creation failed")
                );

                await expect(
                    usePersonaStore.getState().createInstance({
                        persona_slug: "test-persona",
                        task_title: "New Task",
                        task_description: "Description"
                    })
                ).rejects.toThrow("Creation failed");

                expect(usePersonaStore.getState().instancesError).toBe("Creation failed");
            });
        });

        describe("sendMessage", () => {
            it("sends message and refreshes instance", async () => {
                const mockInstance = createMockPersonaInstance();

                vi.mocked(api.sendPersonaInstanceMessage).mockResolvedValueOnce({
                    success: true,
                    data: { message: "sent", instance_id: "instance-123", content: "Hello!" }
                } as never);
                vi.mocked(api.getPersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: mockInstance
                } as never);

                await usePersonaStore.getState().sendMessage("instance-123", "Hello!");

                expect(api.sendPersonaInstanceMessage).toHaveBeenCalledWith(
                    "instance-123",
                    "Hello!"
                );
                expect(api.getPersonaInstance).toHaveBeenCalledWith("instance-123");
            });

            it("throws error on failure", async () => {
                vi.mocked(api.sendPersonaInstanceMessage).mockRejectedValueOnce(
                    new Error("Send failed")
                );

                await expect(
                    usePersonaStore.getState().sendMessage("instance-123", "Hello!")
                ).rejects.toThrow("Send failed");
            });
        });

        describe("cancelInstance", () => {
            it("cancels instance and refreshes state", async () => {
                const mockDashboard = createMockDashboard();

                vi.mocked(api.cancelPersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: createMockPersonaInstance({ status: "cancelled" })
                } as never);
                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValue({
                    success: true,
                    data: mockDashboard
                } as never);
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValue({
                    success: true,
                    data: { count: 0 }
                } as never);

                await usePersonaStore.getState().cancelInstance("instance-123");

                expect(api.cancelPersonaInstance).toHaveBeenCalledWith("instance-123");
                expect(usePersonaStore.getState().isLoadingInstances).toBe(false);
            });

            it("refreshes current instance if it matches", async () => {
                const mockInstance = createMockPersonaInstance({ id: "instance-123" });
                usePersonaStore.setState({ currentInstance: mockInstance as never });

                vi.mocked(api.cancelPersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: { ...mockInstance, status: "cancelled" }
                } as never);
                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValue({
                    success: true,
                    data: createMockDashboard()
                } as never);
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValue({
                    success: true,
                    data: { count: 0 }
                } as never);
                vi.mocked(api.getPersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: { ...mockInstance, status: "cancelled" }
                } as never);

                await usePersonaStore.getState().cancelInstance("instance-123");

                expect(api.getPersonaInstance).toHaveBeenCalledWith("instance-123");
            });
        });

        describe("completeInstance", () => {
            it("completes instance and refreshes state", async () => {
                const mockDashboard = createMockDashboard();

                vi.mocked(api.completePersonaInstance).mockResolvedValueOnce({
                    success: true,
                    data: createMockPersonaInstance({ status: "completed" })
                } as never);
                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValue({
                    success: true,
                    data: mockDashboard
                } as never);
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValue({
                    success: true,
                    data: { count: 0 }
                } as never);

                await usePersonaStore.getState().completeInstance("instance-123");

                expect(api.completePersonaInstance).toHaveBeenCalledWith("instance-123");
            });
        });

        describe("deleteInstance", () => {
            it("deletes instance and updates local state", async () => {
                const instance1 = createMockInstanceSummary({ id: "instance-123" });
                const instance2 = createMockInstanceSummary({ id: "instance-456" });
                usePersonaStore.setState({
                    instances: [instance1, instance2] as never[],
                    instancesTotal: 2
                });

                vi.mocked(api.deletePersonaInstance).mockResolvedValueOnce({
                    success: true
                } as never);
                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValue({
                    success: true,
                    data: createMockDashboard()
                } as never);
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValue({
                    success: true,
                    data: { count: 0 }
                } as never);

                await usePersonaStore.getState().deleteInstance("instance-123");

                const state = usePersonaStore.getState();
                expect(state.instances).toHaveLength(1);
                expect(state.instances[0].id).toBe("instance-456");
                expect(state.instancesTotal).toBe(1);
            });

            it("clears current instance if deleted", async () => {
                const mockInstance = createMockPersonaInstance({ id: "instance-123" });
                usePersonaStore.setState({
                    currentInstance: mockInstance as never,
                    instances: [createMockInstanceSummary({ id: "instance-123" })] as never[],
                    instancesTotal: 1
                });

                vi.mocked(api.deletePersonaInstance).mockResolvedValueOnce({
                    success: true
                } as never);
                vi.mocked(api.getPersonaInstancesDashboard).mockResolvedValue({
                    success: true,
                    data: createMockDashboard()
                } as never);
                vi.mocked(api.getPersonaInstancesCount).mockResolvedValue({
                    success: true,
                    data: { count: 0 }
                } as never);

                await usePersonaStore.getState().deleteInstance("instance-123");

                expect(usePersonaStore.getState().currentInstance).toBeNull();
            });
        });

        describe("setCurrentInstance", () => {
            it("sets current instance", () => {
                const instance = createMockPersonaInstance();

                usePersonaStore.getState().setCurrentInstance(instance as never);

                expect(usePersonaStore.getState().currentInstance).toEqual(instance);
            });

            it("clears current instance when passed null", () => {
                usePersonaStore.setState({ currentInstance: createMockPersonaInstance() as never });

                usePersonaStore.getState().setCurrentInstance(null);

                expect(usePersonaStore.getState().currentInstance).toBeNull();
            });
        });

        describe("clearInstancesError", () => {
            it("clears instances error", () => {
                usePersonaStore.setState({ instancesError: "Some error" });

                usePersonaStore.getState().clearInstancesError();

                expect(usePersonaStore.getState().instancesError).toBeNull();
            });
        });

        describe("resetInstancesState", () => {
            it("resets all instances state", () => {
                usePersonaStore.setState({
                    dashboard: createMockDashboard() as never,
                    instances: [createMockInstanceSummary()] as never[],
                    currentInstance: createMockPersonaInstance() as never,
                    instancesTotal: 5,
                    needsAttentionCount: 3,
                    instancesError: "Some error"
                });

                usePersonaStore.getState().resetInstancesState();

                const state = usePersonaStore.getState();
                expect(state.dashboard).toBeNull();
                expect(state.instances).toEqual([]);
                expect(state.currentInstance).toBeNull();
                expect(state.instancesTotal).toBe(0);
                expect(state.needsAttentionCount).toBe(0);
                expect(state.instancesError).toBeNull();
            });
        });
    });
});
