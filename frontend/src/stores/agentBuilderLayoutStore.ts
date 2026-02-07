import { create } from "zustand";
import { persist } from "zustand/middleware";

// Panel state types
export type PanelState = "expanded" | "collapsed" | "minimized";
export type PanelId = "navigation" | "config" | "chat";

export interface PanelConfig {
    state: PanelState;
    width: number;
    minWidth: number;
    order: number; // 0=left, 1=middle, 2=right
}

// Section collapse states (within config panel)
export interface SectionStates {
    modelSection: boolean;
    instructionsSection: boolean;
    toolsSection: boolean;
}

// Default panel configurations
const DEFAULT_PANELS: Record<PanelId, PanelConfig> = {
    navigation: {
        state: "collapsed",
        width: 256,
        minWidth: 64,
        order: 0
    },
    config: {
        state: "expanded",
        width: 500,
        minWidth: 300,
        order: 1
    },
    chat: {
        state: "collapsed",
        width: 0, // flex-1, no fixed width
        minWidth: 400,
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

    // Actions - Panel management
    setPanelState: (panelId: PanelId, state: PanelState) => void;
    togglePanel: (panelId: PanelId) => void;

    // Actions - Section management
    setSectionExpanded: (sectionId: keyof SectionStates, expanded: boolean) => void;
    toggleSection: (sectionId: keyof SectionStates) => void;

    // Actions - Reset
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

            setPanelState: (panelId, state) => {
                set((s) => ({
                    panels: {
                        ...s.panels,
                        [panelId]: { ...s.panels[panelId], state }
                    }
                }));
            },

            togglePanel: (panelId) => {
                const current = get().panels[panelId].state;
                // If minimized or collapsed, expand. If expanded, collapse.
                const next: PanelState = current === "expanded" ? "collapsed" : "expanded";
                get().setPanelState(panelId, next);
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

            resetLayout: () => {
                set({
                    panels: { ...DEFAULT_PANELS },
                    sections: { ...DEFAULT_SECTIONS }
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
                sections: state.sections
            })
        }
    )
);
