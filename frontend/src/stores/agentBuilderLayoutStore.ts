import { create } from "zustand";
import { persist } from "zustand/middleware";

// Panel state types
export type PanelState = "expanded" | "collapsed" | "minimized";
export type PanelId = "navigation" | "config" | "chat";

export interface PanelConfig {
    state: PanelState;
    width: number;
    minWidth: number;
    maxWidth: number;
    order: number; // 0=left, 1=middle, 2=right
}

// Section collapse states (within config panel)
export interface SectionStates {
    modelSection: boolean;
    instructionsSection: boolean;
    toolsSection: boolean;
}

// Layout presets
export type LayoutPreset = "default" | "chat-focused" | "config-focused";

interface LayoutPresetConfig {
    navigation: PanelState;
    config: PanelState;
    chat: PanelState;
}

const LAYOUT_PRESETS: Record<LayoutPreset, LayoutPresetConfig> = {
    default: { navigation: "expanded", config: "expanded", chat: "expanded" },
    "chat-focused": { navigation: "collapsed", config: "minimized", chat: "expanded" },
    "config-focused": { navigation: "collapsed", config: "expanded", chat: "minimized" }
};

// Default panel configurations
const DEFAULT_PANELS: Record<PanelId, PanelConfig> = {
    navigation: {
        state: "expanded",
        width: 256,
        minWidth: 64,
        maxWidth: 320,
        order: 0
    },
    config: {
        state: "expanded",
        width: 500,
        minWidth: 300,
        maxWidth: 800,
        order: 1
    },
    chat: {
        state: "expanded",
        width: 0, // flex-1, no fixed width
        minWidth: 400,
        maxWidth: 0, // no max, takes remaining space
        order: 2
    }
};

const DEFAULT_SECTIONS: SectionStates = {
    modelSection: true,
    instructionsSection: true,
    toolsSection: true
};

interface AgentBuilderLayoutStore {
    // Panel states
    panels: Record<PanelId, PanelConfig>;

    // Section states (within config panel)
    sections: SectionStates;

    // Current preset (null if custom layout)
    activePreset: LayoutPreset | null;

    // Actions - Panel management
    setPanelState: (panelId: PanelId, state: PanelState) => void;
    setPanelWidth: (panelId: PanelId, width: number) => void;
    togglePanel: (panelId: PanelId) => void;
    swapPanels: (panelA: PanelId, panelB: PanelId) => void;

    // Actions - Section management
    setSectionExpanded: (sectionId: keyof SectionStates, expanded: boolean) => void;
    toggleSection: (sectionId: keyof SectionStates) => void;

    // Actions - Presets
    applyPreset: (preset: LayoutPreset) => void;
    resetLayout: () => void;

    // Selectors
    getPanelsByOrder: () => PanelId[];
    isAnyPanelCollapsed: () => boolean;
}

export const useAgentBuilderLayoutStore = create<AgentBuilderLayoutStore>()(
    persist(
        (set, get) => ({
            panels: { ...DEFAULT_PANELS },
            sections: { ...DEFAULT_SECTIONS },
            activePreset: "default",

            setPanelState: (panelId, state) => {
                set((s) => ({
                    panels: {
                        ...s.panels,
                        [panelId]: { ...s.panels[panelId], state }
                    },
                    activePreset: null // Custom layout invalidates preset
                }));
            },

            setPanelWidth: (panelId, width) => {
                const panel = get().panels[panelId];
                // Skip clamping for panels without maxWidth (flex panels)
                const clampedWidth =
                    panel.maxWidth > 0
                        ? Math.max(panel.minWidth, Math.min(panel.maxWidth, width))
                        : Math.max(panel.minWidth, width);

                set((s) => ({
                    panels: {
                        ...s.panels,
                        [panelId]: { ...s.panels[panelId], width: clampedWidth }
                    }
                }));
            },

            togglePanel: (panelId) => {
                const current = get().panels[panelId].state;
                // If minimized or collapsed, expand. If expanded, collapse.
                const next: PanelState = current === "expanded" ? "collapsed" : "expanded";
                get().setPanelState(panelId, next);
            },

            swapPanels: (panelA, panelB) => {
                set((s) => {
                    const orderA = s.panels[panelA].order;
                    const orderB = s.panels[panelB].order;
                    return {
                        panels: {
                            ...s.panels,
                            [panelA]: { ...s.panels[panelA], order: orderB },
                            [panelB]: { ...s.panels[panelB], order: orderA }
                        },
                        activePreset: null // Custom layout
                    };
                });
            },

            setSectionExpanded: (sectionId, expanded) => {
                set((s) => ({
                    sections: { ...s.sections, [sectionId]: expanded }
                }));
            },

            toggleSection: (sectionId) => {
                set((s) => ({
                    sections: { ...s.sections, [sectionId]: !s.sections[sectionId] }
                }));
            },

            applyPreset: (preset) => {
                const presetConfig = LAYOUT_PRESETS[preset];
                set((s) => ({
                    panels: {
                        navigation: { ...s.panels.navigation, state: presetConfig.navigation },
                        config: { ...s.panels.config, state: presetConfig.config },
                        chat: { ...s.panels.chat, state: presetConfig.chat }
                    },
                    activePreset: preset
                }));
            },

            resetLayout: () => {
                set({
                    panels: { ...DEFAULT_PANELS },
                    sections: { ...DEFAULT_SECTIONS },
                    activePreset: "default"
                });
            },

            getPanelsByOrder: () => {
                const { panels } = get();
                const panelIds = Object.keys(panels) as PanelId[];
                return panelIds.sort((a, b) => panels[a].order - panels[b].order);
            },

            isAnyPanelCollapsed: () => {
                const { panels } = get();
                return Object.values(panels).some((p) => p.state === "collapsed");
            }
        }),
        {
            name: "agent-builder-layout",
            partialize: (state) => ({
                panels: state.panels,
                sections: state.sections,
                activePreset: state.activePreset
            })
        }
    )
);
