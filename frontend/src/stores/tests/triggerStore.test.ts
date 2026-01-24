/**
 * Trigger Store Tests
 *
 * Tests for trigger drawer state and trigger data management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useTriggerStore } from "../triggerStore";

// Mock trigger data
function createMockTrigger(overrides?: Record<string, unknown>) {
    const defaults = {
        id: "trigger-123",
        workflowId: "workflow-123",
        type: "schedule" as const,
        name: "Test Trigger",
        config: {
            schedule: "0 * * * *"
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return { ...defaults, ...overrides };
}

// Reset store before each test
function resetStore() {
    useTriggerStore.setState({
        isDrawerOpen: false,
        drawerWidth: 500,
        triggers: [],
        loadingTriggers: false,
        selectedTriggerId: null
    });
}

describe("triggerStore", () => {
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
            const state = useTriggerStore.getState();

            expect(state.isDrawerOpen).toBe(false);
            expect(state.drawerWidth).toBe(500);
            expect(state.triggers).toEqual([]);
            expect(state.loadingTriggers).toBe(false);
            expect(state.selectedTriggerId).toBeNull();
        });
    });

    // ===== Drawer State =====
    describe("drawer state", () => {
        it("opens drawer", () => {
            useTriggerStore.getState().setDrawerOpen(true);
            expect(useTriggerStore.getState().isDrawerOpen).toBe(true);
        });

        it("closes drawer", () => {
            useTriggerStore.setState({ isDrawerOpen: true });
            useTriggerStore.getState().setDrawerOpen(false);
            expect(useTriggerStore.getState().isDrawerOpen).toBe(false);
        });

        it("sets drawer width within constraints", () => {
            useTriggerStore.getState().setDrawerWidth(600);
            expect(useTriggerStore.getState().drawerWidth).toBe(600);
        });

        it("clamps drawer width to minimum (400)", () => {
            useTriggerStore.getState().setDrawerWidth(200);
            expect(useTriggerStore.getState().drawerWidth).toBe(400);
        });

        it("clamps drawer width to maximum (800)", () => {
            useTriggerStore.getState().setDrawerWidth(1000);
            expect(useTriggerStore.getState().drawerWidth).toBe(800);
        });

        it("handles edge case at minimum boundary", () => {
            useTriggerStore.getState().setDrawerWidth(400);
            expect(useTriggerStore.getState().drawerWidth).toBe(400);
        });

        it("handles edge case at maximum boundary", () => {
            useTriggerStore.getState().setDrawerWidth(800);
            expect(useTriggerStore.getState().drawerWidth).toBe(800);
        });
    });

    // ===== Triggers Management =====
    describe("triggers management", () => {
        it("sets triggers", () => {
            const triggers = [createMockTrigger(), createMockTrigger({ id: "trigger-456" })];

            useTriggerStore.getState().setTriggers(triggers);

            expect(useTriggerStore.getState().triggers).toHaveLength(2);
        });

        it("sets loading triggers state", () => {
            useTriggerStore.getState().setLoadingTriggers(true);
            expect(useTriggerStore.getState().loadingTriggers).toBe(true);

            useTriggerStore.getState().setLoadingTriggers(false);
            expect(useTriggerStore.getState().loadingTriggers).toBe(false);
        });

        it("adds a trigger", () => {
            const trigger = createMockTrigger();

            useTriggerStore.getState().addTrigger(trigger);

            expect(useTriggerStore.getState().triggers).toHaveLength(1);
            expect(useTriggerStore.getState().triggers[0].id).toBe("trigger-123");
        });

        it("adds multiple triggers", () => {
            useTriggerStore.getState().addTrigger(createMockTrigger({ id: "trigger-1" }));
            useTriggerStore.getState().addTrigger(createMockTrigger({ id: "trigger-2" }));
            useTriggerStore.getState().addTrigger(createMockTrigger({ id: "trigger-3" }));

            expect(useTriggerStore.getState().triggers).toHaveLength(3);
        });

        it("updates a trigger", () => {
            const trigger = createMockTrigger();
            useTriggerStore.setState({ triggers: [trigger] });

            useTriggerStore.getState().updateTrigger("trigger-123", {
                name: "Updated Trigger",
                isActive: false
            });

            const state = useTriggerStore.getState();
            expect(state.triggers[0].name).toBe("Updated Trigger");
            expect(state.triggers[0].isActive).toBe(false);
        });

        it("updates only the matching trigger", () => {
            const trigger1 = createMockTrigger({ id: "trigger-1", name: "Trigger 1" });
            const trigger2 = createMockTrigger({ id: "trigger-2", name: "Trigger 2" });
            useTriggerStore.setState({ triggers: [trigger1, trigger2] });

            useTriggerStore.getState().updateTrigger("trigger-1", { name: "Updated" });

            const state = useTriggerStore.getState();
            expect(state.triggers[0].name).toBe("Updated");
            expect(state.triggers[1].name).toBe("Trigger 2");
        });

        it("removes a trigger", () => {
            const trigger1 = createMockTrigger({ id: "trigger-1" });
            const trigger2 = createMockTrigger({ id: "trigger-2" });
            useTriggerStore.setState({ triggers: [trigger1, trigger2] });

            useTriggerStore.getState().removeTrigger("trigger-1");

            const state = useTriggerStore.getState();
            expect(state.triggers).toHaveLength(1);
            expect(state.triggers[0].id).toBe("trigger-2");
        });

        it("clears selectedTriggerId when removing selected trigger", () => {
            const trigger = createMockTrigger();
            useTriggerStore.setState({
                triggers: [trigger],
                selectedTriggerId: "trigger-123"
            });

            useTriggerStore.getState().removeTrigger("trigger-123");

            expect(useTriggerStore.getState().selectedTriggerId).toBeNull();
        });

        it("preserves selectedTriggerId when removing different trigger", () => {
            const trigger1 = createMockTrigger({ id: "trigger-1" });
            const trigger2 = createMockTrigger({ id: "trigger-2" });
            useTriggerStore.setState({
                triggers: [trigger1, trigger2],
                selectedTriggerId: "trigger-1"
            });

            useTriggerStore.getState().removeTrigger("trigger-2");

            expect(useTriggerStore.getState().selectedTriggerId).toBe("trigger-1");
        });
    });

    // ===== Selection =====
    describe("selection", () => {
        it("sets selected trigger id", () => {
            useTriggerStore.getState().setSelectedTriggerId("trigger-123");
            expect(useTriggerStore.getState().selectedTriggerId).toBe("trigger-123");
        });

        it("clears selected trigger id", () => {
            useTriggerStore.setState({ selectedTriggerId: "trigger-123" });

            useTriggerStore.getState().setSelectedTriggerId(null);

            expect(useTriggerStore.getState().selectedTriggerId).toBeNull();
        });

        it("changes selection to different trigger", () => {
            useTriggerStore.setState({ selectedTriggerId: "trigger-1" });

            useTriggerStore.getState().setSelectedTriggerId("trigger-2");

            expect(useTriggerStore.getState().selectedTriggerId).toBe("trigger-2");
        });
    });

    // ===== Clear Triggers =====
    describe("clearTriggers", () => {
        it("clears all trigger state", () => {
            useTriggerStore.setState({
                triggers: [createMockTrigger(), createMockTrigger({ id: "trigger-2" })],
                selectedTriggerId: "trigger-123",
                loadingTriggers: true
            });

            useTriggerStore.getState().clearTriggers();

            const state = useTriggerStore.getState();
            expect(state.triggers).toEqual([]);
            expect(state.selectedTriggerId).toBeNull();
            expect(state.loadingTriggers).toBe(false);
        });

        it("does not affect drawer state", () => {
            useTriggerStore.setState({
                isDrawerOpen: true,
                drawerWidth: 600,
                triggers: [createMockTrigger()]
            });

            useTriggerStore.getState().clearTriggers();

            const state = useTriggerStore.getState();
            expect(state.isDrawerOpen).toBe(true);
            expect(state.drawerWidth).toBe(600);
        });
    });
});

// ===== Trigger Types =====
describe("trigger types", () => {
    beforeEach(() => {
        resetStore();
    });

    it("supports schedule trigger type", () => {
        const trigger = createMockTrigger({ type: "schedule" });
        useTriggerStore.getState().addTrigger(trigger);

        expect(useTriggerStore.getState().triggers[0].type).toBe("schedule");
    });

    it("supports webhook trigger type", () => {
        const trigger = createMockTrigger({
            type: "webhook",
            config: { endpoint: "/api/webhook" }
        });
        useTriggerStore.getState().addTrigger(trigger);

        expect(useTriggerStore.getState().triggers[0].type).toBe("webhook");
    });

    it("supports active/inactive status", () => {
        const activeTrigger = createMockTrigger({ isActive: true });
        const inactiveTrigger = createMockTrigger({ id: "trigger-2", isActive: false });

        useTriggerStore.getState().addTrigger(activeTrigger);
        useTriggerStore.getState().addTrigger(inactiveTrigger);

        const state = useTriggerStore.getState();
        expect(state.triggers[0].isActive).toBe(true);
        expect(state.triggers[1].isActive).toBe(false);
    });
});
