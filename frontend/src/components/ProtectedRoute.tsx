import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { AppLayoutSkeleton } from "./skeletons";

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
        return <AppLayoutSkeleton />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Wait for workspace to be set (should always have one after initialization)
    if (!currentWorkspace) {
        return <AppLayoutSkeleton />;
    }

    return <>{children}</>;
}
