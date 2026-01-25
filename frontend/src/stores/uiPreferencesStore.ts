import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIPreferencesStore {
    // Sidebar collapsed state
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebarCollapsed: () => void;

    // Folder grid section on item list pages (Workflows, Agents, etc.)
    showFoldersSection: boolean;
    setShowFoldersSection: (show: boolean) => void;

    // Sidebar folders section expand/collapse
    sidebarFoldersExpanded: boolean;
    setSidebarFoldersExpanded: (expanded: boolean) => void;
    toggleSidebarFoldersExpanded: () => void;
}

export const useUIPreferencesStore = create<UIPreferencesStore>()(
    persist(
        (set) => ({
            sidebarCollapsed: false,
            showFoldersSection: false,
            sidebarFoldersExpanded: false,

            setSidebarCollapsed: (collapsed: boolean) => {
                set({ sidebarCollapsed: collapsed });
            },

            toggleSidebarCollapsed: () => {
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
            },

            setShowFoldersSection: (show: boolean) => {
                set({ showFoldersSection: show });
            },

            setSidebarFoldersExpanded: (expanded: boolean) => {
                set({ sidebarFoldersExpanded: expanded });
            },

            toggleSidebarFoldersExpanded: () => {
                set((state) => ({ sidebarFoldersExpanded: !state.sidebarFoldersExpanded }));
            }
        }),
        {
            name: "ui_preferences"
        }
    )
);
