import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Protected route wrapper that handles authentication and workspace initialization.
 *
 * Note: All real-time events are now handled via SSE:
 * - Workflow execution: BuilderHeader, TriggerCard
 * - Agent execution: AgentChat
 * - KB document processing: KnowledgeBaseDetail
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
    const {
        isInitialized: isWorkspaceInitialized,
        isLoading: isWorkspaceLoading,
        currentWorkspace
    } = useWorkspaceStore();

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
