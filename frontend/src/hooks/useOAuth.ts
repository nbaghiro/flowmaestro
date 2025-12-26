import { useState } from "react";
import { logger } from "../lib/logger";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface OAuthProvider {
    name: string;
    displayName: string;
    scopes: string[];
    configured: boolean;
}

interface OAuthConnection {
    id: string;
    name: string;
    provider: string;
    status: string;
    metadata: {
        account_info?: {
            email?: string;
            workspace?: string;
            user?: string;
        };
    };
}

interface OAuthMessageData {
    type: "oauth_success" | "oauth_error";
    provider: string;
    connection?: OAuthConnection;
    error?: string;
}

/**
 * Hook for OAuth integration flow
 *
 * Handles:
 * - Fetching available OAuth providers
 * - Initiating OAuth popup flow
 * - Listening for callback messages
 * - Error handling
 */
export function useOAuth() {
    const [loading, setLoading] = useState(false);
    const [providers, setProviders] = useState<OAuthProvider[]>([]);

    /**
     * Fetch available OAuth providers
     */
    const fetchProviders = async () => {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/oauth/providers`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setProviders(data.data);
            }
        } catch (error) {
            logger.error("Failed to fetch OAuth providers", error);
        }
    };

    /**
     * Initiate OAuth flow for a provider
     *
     * Opens a popup window with the OAuth authorization URL,
     * then waits for the callback to post a message back.
     *
     * @param provider - The OAuth provider name
     * @param settings - Optional provider-specific settings (e.g., subdomain for Zendesk)
     */
    const initiateOAuth = async (
        provider: string,
        settings?: Record<string, string>
    ): Promise<OAuthConnection> => {
        setLoading(true);

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
                throw new Error("Not authenticated. Please log in first.");
            }

            // Build URL with optional settings as query params
            const url = new URL(`${API_BASE_URL}/oauth/${provider}/authorize`);
            if (settings) {
                Object.entries(settings).forEach(([key, value]) => {
                    if (value) {
                        url.searchParams.set(key, value);
                    }
                });
            }

            // Get authorization URL from backend
            const response = await fetch(url.toString(), {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!data.success || !data.data?.authUrl) {
                throw new Error(data.error || "Failed to get authorization URL");
            }

            const authUrl = data.data.authUrl;

            // Open OAuth popup
            const popup = openOAuthPopup(authUrl, provider);

            // Check if popup was blocked (null) or immediately closed
            if (!popup || popup.closed) {
                throw new Error("Failed to open popup window. Please allow popups for this site.");
            }

            // Wait for callback message
            return await waitForOAuthCallback(popup, provider);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    /**
     * Open OAuth authorization popup window
     */
    const openOAuthPopup = (url: string, provider: string): Window | null => {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
            url,
            `oauth_${provider}`,
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        return popup;
    };

    /**
     * Wait for OAuth callback message from popup
     */
    const waitForOAuthCallback = (popup: Window, provider: string): Promise<OAuthConnection> => {
        return new Promise((resolve, reject) => {
            // Set timeout (5 minutes)
            const timeout = setTimeout(
                () => {
                    cleanup();
                    reject(new Error("OAuth flow timed out"));
                },
                5 * 60 * 1000
            );

            // Listen for messages from popup
            const messageHandler = (event: MessageEvent) => {
                // Verify origin (in production, check against your backend URL)
                // if (event.origin !== API_BASE_URL) return;

                const data = event.data as OAuthMessageData;

                // Only handle OAuth messages for this provider
                if (!data.type || data.provider !== provider) {
                    return;
                }

                if (data.type === "oauth_success" && data.connection) {
                    cleanup();
                    resolve(data.connection);
                } else if (data.type === "oauth_error") {
                    cleanup();
                    reject(new Error(data.error || "OAuth authorization failed"));
                }
            };

            // Cleanup function
            const cleanup = () => {
                clearTimeout(timeout);
                window.removeEventListener("message", messageHandler);
                setLoading(false);
                popup.close();
            };

            // Register message listener
            window.addEventListener("message", messageHandler);
        });
    };

    /**
     * Revoke an OAuth connection
     */
    const revokeConnection = async (provider: string, connectionId: string): Promise<void> => {
        const token = localStorage.getItem("auth_token");
        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_BASE_URL}/oauth/${provider}/revoke/${connectionId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Failed to revoke connection");
        }
    };

    /**
     * Manually refresh a connection's token
     */
    const refreshConnection = async (provider: string, connectionId: string): Promise<void> => {
        const token = localStorage.getItem("auth_token");
        if (!token) {
            throw new Error("Not authenticated");
        }

        const response = await fetch(`${API_BASE_URL}/oauth/${provider}/refresh/${connectionId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Failed to refresh connection");
        }
    };

    return {
        loading,
        providers,
        fetchProviders,
        initiateOAuth,
        revokeConnection,
        refreshConnection
    };
}
