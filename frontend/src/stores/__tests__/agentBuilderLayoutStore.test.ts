/**
 * Agent Builder Layout Store Tests
 *
 * Tests for agent builder layout state management including
 * panel management, sections, presets, and selectors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock localStorage for persist middleware
const mockLocalStorage = {
    store: {} as Record<string, string>,
    getItem: vi.fn((key: string) => mockLocalStorage.store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage.store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete mockLocalStorage.store[key];
    }),
    clear: vi.fn(() => {
        mockLocalStorage.store = {};
    })
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage });

import { useAgentBuilderLayoutStore } from "../agentBuilderLayoutStore";
import type { PanelState } from "../agentBuilderLayoutStore";

// Default panel configs for reset
const DEFAULT_PANELS = {
    navigation: {
        state: "expanded" as PanelState,
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
        state: "expanded" as PanelState,
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
        sections: { ...DEFAULT_SECTIONS },
        activePreset: "default"
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

            expect(state.panels.navigation.state).toBe("expanded");
            expect(state.panels.config.state).toBe("expanded");
            expect(state.panels.chat.state).toBe("expanded");
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

        it("has default preset active", () => {
            resetStore();
            expect(useAgentBuilderLayoutStore.getState().activePreset).toBe("default");
        });
    });

    // ===== Panel State Management =====
    describe("setPanelState", () => {
        it("sets panel state to collapsed", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");

            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("collapsed");
        });

        it("sets panel state to minimized", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("config", "minimized");

            expect(useAgentBuilderLayoutStore.getState().panels.config.state).toBe("minimized");
        });

        it("invalidates active preset on change", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");

            expect(useAgentBuilderLayoutStore.getState().activePreset).toBeNull();
        });
    });

    describe("togglePanel", () => {
        it("collapses expanded panel", () => {
            useAgentBuilderLayoutStore.getState().togglePanel("navigation");

            expect(useAgentBuilderLayoutStore.getState().panels.navigation.state).toBe("collapsed");
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

    describe("swapPanels", () => {
        it("swaps panel orders", () => {
            useAgentBuilderLayoutStore.getState().swapPanels("navigation", "config");

            const state = useAgentBuilderLayoutStore.getState();
            expect(state.panels.navigation.order).toBe(1);
            expect(state.panels.config.order).toBe(0);
        });

        it("invalidates active preset on swap", () => {
            useAgentBuilderLayoutStore.getState().swapPanels("navigation", "config");

            expect(useAgentBuilderLayoutStore.getState().activePreset).toBeNull();
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

    // ===== Presets =====
    describe("applyPreset", () => {
        it("applies default preset", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");

            useAgentBuilderLayoutStore.getState().applyPreset("default");

            const state = useAgentBuilderLayoutStore.getState();
            expect(state.panels.navigation.state).toBe("expanded");
            expect(state.panels.config.state).toBe("expanded");
            expect(state.panels.chat.state).toBe("expanded");
            expect(state.activePreset).toBe("default");
        });

        it("applies chat-focused preset", () => {
            useAgentBuilderLayoutStore.getState().applyPreset("chat-focused");

            const state = useAgentBuilderLayoutStore.getState();
            expect(state.panels.navigation.state).toBe("collapsed");
            expect(state.panels.config.state).toBe("minimized");
            expect(state.panels.chat.state).toBe("expanded");
            expect(state.activePreset).toBe("chat-focused");
        });

        it("applies config-focused preset", () => {
            useAgentBuilderLayoutStore.getState().applyPreset("config-focused");

            const state = useAgentBuilderLayoutStore.getState();
            expect(state.panels.navigation.state).toBe("collapsed");
            expect(state.panels.config.state).toBe("expanded");
            expect(state.panels.chat.state).toBe("minimized");
            expect(state.activePreset).toBe("config-focused");
        });
    });

    describe("resetLayout", () => {
        it("resets all panels to default", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");
            useAgentBuilderLayoutStore.getState().setSectionExpanded("modelSection", false);

            useAgentBuilderLayoutStore.getState().resetLayout();

            const state = useAgentBuilderLayoutStore.getState();
            expect(state.panels.navigation.state).toBe("expanded");
            expect(state.panels.config.width).toBe(500);
            expect(state.sections.modelSection).toBe(true);
            expect(state.activePreset).toBe("default");
        });
    });

    // ===== Selectors =====
    describe("getPanelsByOrder", () => {
        it("returns panels sorted by order", () => {
            const orderedPanels = useAgentBuilderLayoutStore.getState().getPanelsByOrder();

            expect(orderedPanels).toEqual(["navigation", "config", "chat"]);
        });

        it("returns updated order after swap", () => {
            // Before: navigation=0, config=1, chat=2
            // After swap(navigation, chat): navigation=2, config=1, chat=0
            useAgentBuilderLayoutStore.getState().swapPanels("navigation", "chat");

            const orderedPanels = useAgentBuilderLayoutStore.getState().getPanelsByOrder();

            expect(orderedPanels[0]).toBe("chat"); // order 0
            expect(orderedPanels[1]).toBe("config"); // order 1
            expect(orderedPanels[2]).toBe("navigation"); // order 2
        });
    });

    describe("isAnyPanelCollapsed", () => {
        it("returns false when all panels expanded", () => {
            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(false);
        });

        it("returns true when any panel collapsed", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");

            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(true);
        });

        it("returns false when panel is minimized (not collapsed)", () => {
            useAgentBuilderLayoutStore.getState().setPanelState("config", "minimized");

            expect(useAgentBuilderLayoutStore.getState().isAnyPanelCollapsed()).toBe(false);
        });
    });

    // ===== Full Workflow =====
    describe("full layout workflow", () => {
        it("handles complete layout customization", () => {
            // Start with default
            expect(useAgentBuilderLayoutStore.getState().activePreset).toBe("default");

            // Customize layout
            useAgentBuilderLayoutStore.getState().setPanelState("navigation", "collapsed");
            useAgentBuilderLayoutStore.getState().toggleSection("toolsSection");

            // Preset should be invalidated
            expect(useAgentBuilderLayoutStore.getState().activePreset).toBeNull();

            // Apply preset to restore
            useAgentBuilderLayoutStore.getState().applyPreset("chat-focused");
            expect(useAgentBuilderLayoutStore.getState().activePreset).toBe("chat-focused");

            // Reset to defaults
            useAgentBuilderLayoutStore.getState().resetLayout();
            expect(useAgentBuilderLayoutStore.getState().activePreset).toBe("default");
            expect(useAgentBuilderLayoutStore.getState().sections.toolsSection).toBe(true);
        });
    });
});
