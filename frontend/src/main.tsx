import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useEffect, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initAnalytics } from "./lib/analytics";
import { initDebug } from "./lib/debug";
import { useAuthStore } from "./stores/authStore";
import { useWorkspaceStore } from "./stores/workspaceStore";
import "./App.css";

// Initialize analytics before React renders
initAnalytics();

// Initialize debug namespace in development
initDebug();

// Create a client for TanStack Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000 // 5 minutes
        }
    }
});

// Initialize auth and workspace stores on app mount
function StoreInitializer({ children }: { children: ReactNode }) {
    const initializeAuth = useAuthStore((state) => state.initialize);
    const isAuthInitialized = useAuthStore((state) => state.isInitialized);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const initializeWorkspace = useWorkspaceStore((state) => state.initialize);

    // Initialize auth first
    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    // Initialize workspace after auth is done and user is authenticated
    useEffect(() => {
        if (isAuthInitialized && isAuthenticated) {
            initializeWorkspace();
        }
    }, [isAuthInitialized, isAuthenticated, initializeWorkspace]);

    return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <StoreInitializer>
                    <App />
                </StoreInitializer>
            </QueryClientProvider>
        </BrowserRouter>
    </React.StrictMode>
);
