import { create } from "zustand";
import { logger } from "../lib/logger";

interface UIPreferencesStore {
    showFoldersSection: boolean;
    setShowFoldersSection: (show: boolean) => void;
    initializePreferences: () => void;
}

const STORAGE_KEY = "ui_preferences";

interface StoredPreferences {
    showFoldersSection: boolean;
}

const defaultPreferences: StoredPreferences = {
    showFoldersSection: false
};

export const useUIPreferencesStore = create<UIPreferencesStore>((set) => ({
    showFoldersSection: false,

    setShowFoldersSection: (show: boolean) => {
        // Save to localStorage
        const stored = getStoredPreferences();
        const updated: StoredPreferences = {
            ...stored,
            showFoldersSection: show
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        // Update state
        set({ showFoldersSection: show });
    },

    initializePreferences: () => {
        // Load from localStorage or use defaults
        const stored = getStoredPreferences();

        // Update state
        set({
            showFoldersSection: stored.showFoldersSection
        });
    }
}));

// Helper to get stored preferences
function getStoredPreferences(): StoredPreferences {
    if (typeof window === "undefined") {
        return defaultPreferences;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<StoredPreferences>;
            return {
                ...defaultPreferences,
                ...parsed
            };
        }
    } catch (error) {
        // If parsing fails, return defaults
        logger.error("Failed to parse stored UI preferences", error);
    }

    return defaultPreferences;
}
