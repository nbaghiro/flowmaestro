import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIPreferencesStore {
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
            showFoldersSection: false,
            sidebarFoldersExpanded: false,

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
