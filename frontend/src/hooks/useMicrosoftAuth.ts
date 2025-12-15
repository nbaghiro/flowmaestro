import { useState } from "react";

// Determine API URL - fallback to localhost if not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const MICROSOFT_AUTH_URL = `${API_URL}/auth/microsoft`;

/**
 * Hook for Microsoft OAuth authentication
 *
 * Opens Microsoft OAuth flow in a new window/redirect and handles the authentication
 */
export function useMicrosoftAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Initiate Microsoft OAuth login
     *
     * Opens the Microsoft OAuth flow by redirecting the current window
     * to the Microsoft authorization page. After successful authentication,
     * Microsoft will redirect back to our callback endpoint which will
     * handle token storage and redirect to the app.
     */
    const loginWithMicrosoft = (): void => {
        setIsLoading(true);
        setError(null);

        try {
            console.log("[Microsoft Auth] Redirecting to:", MICROSOFT_AUTH_URL);

            // Redirect to backend Microsoft OAuth endpoint
            // The backend will redirect to Microsoft, and Microsoft will redirect back to our callback
            window.location.href = MICROSOFT_AUTH_URL;
        } catch (err: unknown) {
            console.error("[Microsoft Auth] Failed to redirect:", err);
            setIsLoading(false);
            setError(err instanceof Error ? err.message : "Failed to initiate Microsoft login");
        }
    };

    return {
        loginWithMicrosoft,
        isLoading,
        error
    };
}
