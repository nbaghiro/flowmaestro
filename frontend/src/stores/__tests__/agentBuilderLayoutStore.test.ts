/**
 * Agent Builder Layout Store Tests
 *
 * Tests for agent builder layout state management including
 * panel management, sections, and selectors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage for persist middleware
const mockLocalStorageStore: Record<string, string> = {};
const mockLocalStorage = {
    store: mockLocalStorageStore,
    getItem: vi.fn((key: string) => mockLocalStorageStore[key] || null),
    setItem: vi.fn((key: string, value: string) => {
        mockLocalStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete mockLocalStorageStore[key];
    }),
    clear: vi.fn(() => {
        Object.keys(mockLocalStorageStore).forEach((key) => delete mockLocalStorageStore[key]);
    })
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage });

import { useAgentBuilderLayoutStore } from "../agentBuilderLayoutStore";
import type { PanelState } from "../agentBuilderLayoutStore";

// Default panel configs for reset
const DEFAULT_PANELS = {
    navigation: {
        state: "collapsed" as PanelState,
        width: 256,
        minWidth: 64,
        order: 0
    },
    config: {
        state: "expanded" as PanelState,
        width: 500,
        minWidth: 300,
        order: 1
    },
    chat: {
        state: "collapsed" as PanelState,
        width: 0,
        minWidth: 400,
        order: 2
    }
};

const DEFAULT_SECTIONS = {
    modelSection: true,
    instructionsSection: true,
    toolsSection: true
};

// Reset store before each test
function resetStore() {
    useAgentBuilderLayoutStore.setState({
        panels: { ...DEFAULT_PANELS },
        sections: { ...DEFAULT_SECTIONS }
    });
}

describe("agentBuilderLayoutStore", () => {
    beforeEach(() => {
        resetStore();
        vi.clearAllMocks();
        mockLocalStorage.clear();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial panel states", () => {
            resetStore();
            const state = useAgentBuilderLayoutStore.getState();

            expect(state.panels.navigation.state).toBe("collapsed");
            expect(state.panels.config.state).toBe("expanded");
            expect(state.panels.chat.state).toBe("collapsed");
        });

        it("has correct initial panel widths", () => {
            resetStore();
            const state = useAgentBuilderLayoutStore.getState();

            expect(state.panels.navigation.width).toBe(256);
            expect(state.panels.config.width).toBe(500);
            expect(state.panels.chat.width).toBe(0); // flex panel
        });

        it("has correct initial sections", () => {
            resetStore();
            const state = useAgentBuilderLayoutStore.getState();

            expect(state.sections.modelSection).toBe(true);
            expect(state.sections.instructionsSection).toBe(true);
            expect(state.sections.toolsSection).toBe(true);
        });
    });

    // ===== Panel State Management =====
    describe("setPanelState", () => {
        it("sets panel state to collapsed", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("config", "collapsed");

            expect(useAgentBuilderLayoutStore.getState().panels.config.state).toBe("collapsed");
        });

        it("sets panel state to minimized", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("config", "minimized");

            expect(useAgentBuilderLayoutStore.getState().panels.config.state).toBe("minimized");
        });

        it("sets panel state to expanded", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "expanded");

            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("expanded");
        });
    });

    describe("togglePanel", () => {
        it("collapses expanded panel", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("config", "expanded");
            useAgentBuilderLayoutStore.getState().togglePanel("config");

            expect(useAgentBuilderLayoutStore.getState().panels.config.state).toBe("collapsed");
        });

        it("expands collapsed panel", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");

            useAgentBuilderLayoutStore.getState().togglePanel("navigation");

            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("expanded");
        });

        it("expands minimized panel", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("config", "minimized");

            useAgentBuilderLayoutStore.getState().togglePanel("config");

            expect(useAgentBuilderLayoutStore.getState().panels.config.state).toBe("expanded");
        });
    });

    // ===== Section Management =====
    describe("setSectionExpanded", () => {
        it("expands section", () => {
            useAgentBuilderLayoutStore.setState({
                sections: { ...DEFAULT_SECTIONS, modelSection: false }
            });

            useAgentBuilderLayoutStore.getState().setSectionExpanded("modelSection", true);

            expect(useAgentBuilderLayoutStore.getState().sections.modelSection).toBe(true);
        });

        it("collapses section", () => {
            useAgentBuilderLayoutStore.getState().setSectionExpanded("toolsSection", false);

            expect(useAgentBuilderLayoutStore.getState().sections.toolsSection).toBe(false);
        });
    });

    describe("toggleSection", () => {
        it("toggles section from expanded to collapsed", () => {
            useAgentBuilderLayoutStore.getState().toggleSection("modelSection");

            expect(useAgentBuilderLayoutStore.getState().sections.modelSection).toBe(false);
        });

        it("toggles section from collapsed to expanded", () => {
            useAgentBuilderLayoutStore.setState({
                sections: { ...DEFAULT_SECTIONS, instructionsSection: false }
            });

            useAgentBuilderLayoutStore.getState().toggleSection("instructionsSection");

            expect(useAgentBuilderLayoutStore.getState().sections.instructionsSection).toBe(true);
        });
    });

    // ===== Reset =====
    describe("resetLayout", () => {
        it("resets all panels to default", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "expanded");
            useAgentBuilderLayoutStore.getState().setSectionExpanded("modelSection", false);

            useAgentBuilderLayoutStore.getState().resetLayout();

            const state = useAgentBuilderLayoutStore.getState();
            expect(state.panels.navigation.state).toBe("collapsed");
            expect(state.panels.config.state).toBe("expanded");
            expect(state.panels.config.width).toBe(500);
            expect(state.sections.modelSection).toBe(true);
        });
    });

    // ===== Selectors =====
    describe("getPanelsByOrder", () => {
        it("returns panels sorted by order", () => {
            const orderedPanels = useAgentBuilderLayoutStore.getState().getPanelsByOrder();

            expect(orderedPanels).toEqual(["navigation", "config", "chat"]);
        });
    });

    describe("isAnyPanelCollapsed", () => {
        it("returns true when navigation panel is collapsed by default", () => {
            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(true);
        });

        it("returns true when any panel collapsed", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "expanded");
            useAgentBuilderLayoutStore.getState().setPanelState("config", "collapsed");

            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(true);
        });

        it("returns false when all panels expanded", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "expanded");
            useAgentBuilderLayoutStore.getState().setPanelState("config", "expanded");
            useAgentBuilderLayoutStore.getState().setPanelState("chat", "expanded");

            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(false);
        });

        it("returns false when panel is minimized (not collapsed)", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "expanded");
            useAgentBuilderLayoutStore.getState().setPanelState("config", "minimized");
            useAgentBuilderLayoutStore.getState().setPanelState("chat", "expanded");

            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(false);
        });
    });

    // ===== Full Workflow =====
    describe("full layout workflow", () => {
        it("handles complete layout customization", () => {
            // Start with default (navigation collapsed)
            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("collapsed");

            // Expand navigation
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "expanded");
            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("expanded");

            // Toggle section
            useAgentBuilderLayoutStore.getState().toggleSection("toolsSection");
            expect(useAgentBuilderLayoutStore.getState().sections.toolsSection).toBe(false);

            // Reset to defaults
            useAgentBuilderLayoutStore.getState().resetLayout();
            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("collapsed");
            expect(useAgentBuilderLayoutStore.getState().sections.toolsSection).toBe(true);
        });
    });
});
