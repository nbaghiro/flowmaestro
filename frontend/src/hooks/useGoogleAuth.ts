import { useState } from "react";

// Determine API URL - fallback to localhost if not set
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const GOOGLE_AUTH_URL = `${API_URL}/auth/google`;

/**
 * Hook for Google OAuth authentication
 *
 * Opens Google OAuth flow in a new window/redirect and handles the authentication
 */
export function useGoogleAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Initiate Google OAuth login
     *
     * Opens the Google OAuth flow by redirecting the current window
     * to the Google authorization page. After successful authentication,
     * Google will redirect back to our callback endpoint which will
     * handle token storage and redirect to the app.
     */
    const loginWithGoogle = (): void => {
        setIsLoading(true);
        setError(null);

        try {
            console.log("[Google Auth] Redirecting to:", GOOGLE_AUTH_URL);

            // Redirect to backend Google OAuth endpoint
            // The backend will redirect to Google, and Google will redirect back to our callback
            window.location.href = GOOGLE_AUTH_URL;
        } catch (err: unknown) {
            console.error("[Google Auth] Failed to redirect:", err);
            setIsLoading(false);
            setError(err instanceof Error ? err.message : "Failed to initiate Google login");
        }
    };

    return {
        loginWithGoogle,
        isLoading,
        error
    };
}
