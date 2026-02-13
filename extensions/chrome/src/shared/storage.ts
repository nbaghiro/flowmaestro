import type {
    ExtensionAuthState,
    ExtensionSettings,
    ExtensionUserContext
} from "@flowmaestro/shared";

const STORAGE_KEYS = {
    AUTH: "flowmaestro_auth",
    SETTINGS: "flowmaestro_settings",
    USER_CONTEXT: "flowmaestro_user_context",
    THEME: "flowmaestro_theme",
    INITIAL_TAB: "flowmaestro_initial_tab"
} as const;

export type SidebarTab = "agents" | "workflows" | "kb";

export type Theme = "light" | "dark" | "system";

/**
 * Get authentication state from storage
 */
export async function getAuthState(): Promise<ExtensionAuthState | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
    return result[STORAGE_KEYS.AUTH] || null;
}

/**
 * Set authentication state in storage
 */
export async function setAuthState(state: ExtensionAuthState): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTH]: state });
}

/**
 * Clear authentication state
 */
export async function clearAuthState(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.AUTH);
}

/**
 * Get extension settings from storage
 */
export async function getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const defaultSettings: ExtensionSettings = {
        apiBaseUrl: "http://localhost:3001",
        permissions: {
            sitePermissions: {},
            blockedDomains: ["accounts.google.com", "login.microsoftonline.com", "auth0.com"],
            recentDecisions: [],
            defaultLevel: "none"
        },
        ui: {
            defaultTab: "agents",
            autoIncludeText: true,
            autoIncludeScreenshot: false
        }
    };
    return result[STORAGE_KEYS.SETTINGS] || defaultSettings;
}

/**
 * Set extension settings in storage
 */
export async function setSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

/**
 * Update partial settings
 */
export async function updateSettings(
    partial: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
    const current = await getSettings();
    const updated = { ...current, ...partial };
    await setSettings(updated);
    return updated;
}

/**
 * Get cached user context
 */
export async function getUserContext(): Promise<ExtensionUserContext | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_CONTEXT);
    return result[STORAGE_KEYS.USER_CONTEXT] || null;
}

/**
 * Set user context in storage
 */
export async function setUserContext(context: ExtensionUserContext): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_CONTEXT]: context });
}

/**
 * Clear user context from storage
 */
export async function clearUserContext(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.USER_CONTEXT);
}

/**
 * Clear all extension data
 */
export async function clearAllData(): Promise<void> {
    await chrome.storage.local.clear();
}

/**
 * Get theme preference from storage
 */
export async function getTheme(): Promise<Theme> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.THEME);
    return result[STORAGE_KEYS.THEME] || "system";
}

/**
 * Set theme preference in storage
 */
export async function setTheme(theme: Theme): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.THEME]: theme });
}

/**
 * Get the resolved theme (light or dark) based on preference and system settings
 */
export function getResolvedTheme(theme: Theme): "light" | "dark" {
    if (theme === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
    const resolved = getResolvedTheme(theme);
    if (resolved === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }
}

/**
 * Set initial tab to open in sidebar (used when opening from popup)
 */
export async function setInitialTab(tab: SidebarTab): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.INITIAL_TAB]: tab });
}

/**
 * Get and clear initial tab (one-time use)
 */
export async function consumeInitialTab(): Promise<SidebarTab | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.INITIAL_TAB);
    const tab = result[STORAGE_KEYS.INITIAL_TAB] as SidebarTab | undefined;
    if (tab) {
        await chrome.storage.local.remove(STORAGE_KEYS.INITIAL_TAB);
    }
    return tab || null;
}
