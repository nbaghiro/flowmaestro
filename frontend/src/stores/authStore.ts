import { create } from "zustand";
import {
    login as apiLogin,
    register as apiRegister,
    getCurrentUser,
    setAuthToken,
    clearAuthToken
} from "../lib/api";
import { logger } from "../lib/logger";
import type { ApiUser } from "../lib/api";

interface AuthStore {
    user: ApiUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    initialize: () => Promise<void>;
    login: (
        email: string,
        password: string,
        code?: string
    ) => Promise<{ twoFactorRequired: boolean; maskedPhone?: string }>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    setUser: (user: ApiUser | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,

    initialize: async () => {
        // Prevent double initialization
        if (get().isInitialized) return;

        // Check for OAuth callback with token in URL hash
        const hash = window.location.hash;
        if (hash.includes("auth_token=")) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get("auth_token");
            const userData = params.get("user_data");

            if (token) {
                // Store token
                localStorage.setItem("auth_token", token);
                setAuthToken(token);

                // Parse and store user data
                if (userData) {
                    try {
                        const user = JSON.parse(decodeURIComponent(userData));
                        set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
                        // Refresh to ensure we have the latest fields (including 2FA status)
                        get().refreshUser();

                        // Clear hash from URL
                        window.history.replaceState(null, "", window.location.pathname);
                        return;
                    } catch (error) {
                        logger.error("Failed to parse user data from URL", error);
                    }
                }
            }
        }

        // Check if user is already logged in on mount
        // Support both "token" (from Google OAuth) and "auth_token" (from email/password)
        let token = localStorage.getItem("auth_token");
        const googleToken = localStorage.getItem("token");

        if (googleToken && !token) {
            // Google OAuth callback stored token as "token", migrate to "auth_token"
            localStorage.setItem("auth_token", googleToken);
            localStorage.removeItem("token");
            token = googleToken;

            // Also restore user from localStorage if stored by Google callback
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    set({ user, isAuthenticated: true, isLoading: false, isInitialized: true });
                    return;
                } catch (error) {
                    logger.error("Failed to parse stored user", error);
                    localStorage.removeItem("user");
                }
            }
        }

        if (token) {
            // Validate token and restore user session
            try {
                const response = await getCurrentUser();
                if (response.success && response.data) {
                    set({
                        user: response.data.user,
                        isAuthenticated: true,
                        isLoading: false,
                        isInitialized: true
                    });
                } else {
                    // Token is invalid, clear it
                    clearAuthToken();
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        isInitialized: true
                    });
                }
            } catch (error) {
                // Token is invalid or expired, clear it
                logger.error("Failed to validate token", error);
                clearAuthToken();
                set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true });
            }
        } else {
            set({ isLoading: false, isInitialized: true });
        }
    },

    login: async (email: string, password: string, code?: string) => {
        try {
            const response = await apiLogin(email, password, code);
            if (response.success && response.data && "two_factor_required" in response.data) {
                return {
                    twoFactorRequired: true,
                    maskedPhone: response.data.masked_phone
                };
            }

            if (response.success && response.data && "token" in response.data) {
                setAuthToken(response.data.token);
                set({ user: response.data.user, isAuthenticated: true });
                return { twoFactorRequired: false };
            }

            throw new Error(response.error || "Login failed");
        } catch (error) {
            logger.error("Login failed", error);
            throw error;
        }
    },

    register: async (email: string, password: string, name?: string) => {
        try {
            const response = await apiRegister(email, password, name);
            if (response.success && response.data) {
                setAuthToken(response.data.token);
                set({ user: response.data.user, isAuthenticated: true });
            } else {
                throw new Error(response.error || "Registration failed");
            }
        } catch (error) {
            logger.error("Registration failed", error);
            throw error;
        }
    },

    logout: () => {
        clearAuthToken();
        set({ user: null, isAuthenticated: false });
    },

    refreshUser: async () => {
        try {
            const response = await getCurrentUser();
            if (response.success && response.data) {
                set({ user: response.data.user });
            }
        } catch (error) {
            logger.error("Failed to refresh user", error);
        }
    },

    setUser: (user: ApiUser | null) => {
        set({ user, isAuthenticated: !!user });
    }
}));

// Helper to get auth state outside of React components
export function getAuthState() {
    return useAuthStore.getState();
}
