import type {
    ExtensionAuthState,
    ExtensionSettings,
    ExtensionUserContext
} from "@flowmaestro/shared";

const STORAGE_KEYS = {
    AUTH: "flowmaestro_auth",
    SETTINGS: "flowmaestro_settings",
    USER_CONTEXT: "flowmaestro_user_context"
} as const;

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
 * Clear all extension data
 */
export async function clearAllData(): Promise<void> {
    await chrome.storage.local.clear();
}
