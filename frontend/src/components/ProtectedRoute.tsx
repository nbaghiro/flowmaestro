import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useExecutionEventHandlers } from "../hooks/useExecutionEventHandlers";
import { logger } from "../lib/logger";
import { wsClient } from "../lib/websocket";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
    const {
        isInitialized: isWorkspaceInitialized,
        isLoading: isWorkspaceLoading,
        currentWorkspace
    } = useWorkspaceStore();

    // Set up WebSocket event handlers for execution monitoring
    useExecutionEventHandlers();

    // Initialize WebSocket connection when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const token = localStorage.getItem("auth_token");
            if (token) {
                wsClient.connect(token).catch((error) => {
                    logger.error("Failed to connect WebSocket", error);
                });
            }
        }

        return () => {
            // Disconnect when component unmounts or user logs out
            if (!isAuthenticated) {
                wsClient.disconnect();
            }
        };
    }, [isAuthenticated]);

    // Show loading while auth or workspace is initializing
    if (isAuthLoading || (!isWorkspaceInitialized && isAuthenticated) || isWorkspaceLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Wait for workspace to be set (should always have one after initialization)
    if (!currentWorkspace) {
        return (
            <div className="h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading workspace...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
