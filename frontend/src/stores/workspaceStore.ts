import { create } from "zustand";
import {
    hasPermission as checkPermission,
    type WorkspaceWithStats,
    type WorkspaceMemberWithUser,
    type WorkspaceRole,
    type WorkspacePermission,
    type CreditBalance
} from "@flowmaestro/shared";
import {
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    inviteWorkspaceMember,
    removeWorkspaceMember,
    updateMemberRole,
    getCreditsBalance,
    upgradeWorkspace
} from "../lib/api";

// Local storage keys
const CURRENT_WORKSPACE_KEY = "flowmaestro_current_workspace";
const LAST_WORKSPACE_KEY = "flowmaestro_last_workspace";

interface WorkspaceStore {
    // Workspace lists
    ownedWorkspaces: WorkspaceWithStats[];
    memberWorkspaces: WorkspaceWithStats[];

    // Current workspace
    currentWorkspace: WorkspaceWithStats | null;
    currentRole: WorkspaceRole | null;
    isOwner: boolean;

    // Members
    members: WorkspaceMemberWithUser[];
    membersLoading: boolean;

    // Credits
    creditBalance: CreditBalance | null;
    creditsLoading: boolean;

    // Loading states
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;

    // Actions - Initialization
    initialize: () => Promise<void>;
    fetchWorkspaces: () => Promise<void>;

    // Actions - Workspace CRUD
    createWorkspace: (name: string, description?: string) => Promise<WorkspaceWithStats>;
    updateWorkspace: (
        workspaceId: string,
        data: { name?: string; description?: string }
    ) => Promise<void>;
    deleteWorkspace: (workspaceId: string) => Promise<void>;

    // Actions - Workspace switching
    switchWorkspace: (workspaceId: string) => Promise<void>;
    setCurrentWorkspace: (workspace: WorkspaceWithStats, role: WorkspaceRole) => void;

    // Actions - Members
    fetchMembers: (workspaceId?: string) => Promise<void>;
    inviteMember: (email: string, role: WorkspaceRole, message?: string) => Promise<void>;
    removeMember: (userId: string) => Promise<void>;
    updateMemberRole: (userId: string, role: WorkspaceRole) => Promise<void>;

    // Actions - Credits
    fetchCredits: (workspaceId?: string) => Promise<void>;

    // Actions - Plan
    upgradePlan: (plan: "free" | "pro" | "team") => Promise<void>;

    // Helpers
    hasPermission: (permission: WorkspacePermission) => boolean;
    getCurrentWorkspaceId: () => string | null;
    clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
    // Initial state
    ownedWorkspaces: [],
    memberWorkspaces: [],
    currentWorkspace: null,
    currentRole: null,
    isOwner: false,
    members: [],
    membersLoading: false,
    creditBalance: null,
    creditsLoading: false,
    isLoading: false,
    isInitialized: false,
    error: null,

    // Initialize workspace store - called on app load
    initialize: async () => {
        const { isInitialized, isLoading } = get();
        if (isInitialized || isLoading) return;

        set({ isLoading: true, error: null });

        try {
            // Fetch workspaces
            const response = await getWorkspaces();
            if (!response.data) {
                throw new Error("Failed to fetch workspaces");
            }
            const { owned, member } = response.data;

            set({
                ownedWorkspaces: owned,
                memberWorkspaces: member
            });

            // Determine which workspace to use
            const savedWorkspaceId = localStorage.getItem(CURRENT_WORKSPACE_KEY);
            const allWorkspaces = [...owned, ...member];

            let workspaceToUse: WorkspaceWithStats | null = null;
            let role: WorkspaceRole = "viewer";

            // Try saved workspace first
            if (savedWorkspaceId) {
                workspaceToUse = allWorkspaces.find((w) => w.id === savedWorkspaceId) || null;
            }

            // Fall back to first owned workspace
            if (!workspaceToUse && owned.length > 0) {
                workspaceToUse = owned[0];
            }

            // Fall back to first member workspace
            if (!workspaceToUse && member.length > 0) {
                workspaceToUse = member[0];
            }

            // Determine role
            if (workspaceToUse) {
                const isOwned = owned.some((w) => w.id === workspaceToUse!.id);
                role = isOwned ? "owner" : "member"; // Will be refined when we get full membership data

                // Save to localStorage
                localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceToUse.id);
                localStorage.setItem(LAST_WORKSPACE_KEY, workspaceToUse.id);

                set({
                    currentWorkspace: workspaceToUse,
                    currentRole: role,
                    isOwner: isOwned
                });

                // Fetch credits for current workspace
                get().fetchCredits(workspaceToUse.id);
            }

            set({ isLoading: false, isInitialized: true });
        } catch (error) {
            set({
                isLoading: false,
                isInitialized: true,
                error: error instanceof Error ? error.message : "Failed to load workspaces"
            });
        }
    },

    // Fetch workspaces
    fetchWorkspaces: async () => {
        set({ isLoading: true, error: null });

        try {
            const response = await getWorkspaces();
            if (!response.data) {
                throw new Error("Failed to fetch workspaces");
            }
            const { owned, member } = response.data;

            set({
                ownedWorkspaces: owned,
                memberWorkspaces: member,
                isLoading: false
            });

            // Update current workspace if it was removed
            const { currentWorkspace } = get();
            if (currentWorkspace) {
                const allWorkspaces = [...owned, ...member];
                const stillExists = allWorkspaces.some((w) => w.id === currentWorkspace.id);
                if (!stillExists) {
                    // Switch to first available workspace
                    const newWorkspace = owned[0] || member[0];
                    if (newWorkspace) {
                        get().switchWorkspace(newWorkspace.id);
                    } else {
                        set({ currentWorkspace: null, currentRole: null, isOwner: false });
                        localStorage.removeItem(CURRENT_WORKSPACE_KEY);
                    }
                }
            }
        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error.message : "Failed to load workspaces"
            });
        }
    },

    // Create workspace
    createWorkspace: async (name: string, description?: string) => {
        const response = await createWorkspace({ name, description });
        const newWorkspace = response.data as WorkspaceWithStats;

        // Add to owned workspaces
        set((state) => ({
            ownedWorkspaces: [...state.ownedWorkspaces, newWorkspace]
        }));

        return newWorkspace;
    },

    // Update workspace
    updateWorkspace: async (workspaceId: string, data: { name?: string; description?: string }) => {
        await updateWorkspace(workspaceId, data);

        // Update in local state
        set((state) => {
            const updateInList = (list: WorkspaceWithStats[]) =>
                list.map((w) => (w.id === workspaceId ? { ...w, ...data } : w));

            const newOwned = updateInList(state.ownedWorkspaces);
            const newMember = updateInList(state.memberWorkspaces);

            return {
                ownedWorkspaces: newOwned,
                memberWorkspaces: newMember,
                currentWorkspace:
                    state.currentWorkspace?.id === workspaceId
                        ? { ...state.currentWorkspace, ...data }
                        : state.currentWorkspace
            };
        });
    },

    // Delete workspace
    deleteWorkspace: async (workspaceId: string) => {
        await deleteWorkspace(workspaceId);

        // Remove from local state
        set((state) => ({
            ownedWorkspaces: state.ownedWorkspaces.filter((w) => w.id !== workspaceId),
            memberWorkspaces: state.memberWorkspaces.filter((w) => w.id !== workspaceId)
        }));

        // If deleted current workspace, switch to another
        const { currentWorkspace, ownedWorkspaces, memberWorkspaces } = get();
        if (currentWorkspace?.id === workspaceId) {
            const newWorkspace = ownedWorkspaces[0] || memberWorkspaces[0];
            if (newWorkspace) {
                get().switchWorkspace(newWorkspace.id);
            } else {
                set({ currentWorkspace: null, currentRole: null, isOwner: false });
                localStorage.removeItem(CURRENT_WORKSPACE_KEY);
            }
        }
    },

    // Switch workspace
    switchWorkspace: async (workspaceId: string) => {
        const { ownedWorkspaces, memberWorkspaces } = get();
        const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];

        const workspace = allWorkspaces.find((w) => w.id === workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        const isOwned = ownedWorkspaces.some((w) => w.id === workspaceId);
        const role: WorkspaceRole = isOwned ? "owner" : "member";

        // Update state
        set({
            currentWorkspace: workspace,
            currentRole: role,
            isOwner: isOwned,
            members: [], // Clear members for new workspace
            creditBalance: null // Clear credits for new workspace
        });

        // Save to localStorage
        localStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
        localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);

        // Fetch credits for new workspace
        get().fetchCredits(workspaceId);
    },

    // Set current workspace (for direct setting)
    setCurrentWorkspace: (workspace: WorkspaceWithStats, role: WorkspaceRole) => {
        set({
            currentWorkspace: workspace,
            currentRole: role,
            isOwner: role === "owner"
        });
        localStorage.setItem(CURRENT_WORKSPACE_KEY, workspace.id);
    },

    // Fetch members
    fetchMembers: async (workspaceId?: string) => {
        const wsId = workspaceId || get().currentWorkspace?.id;
        if (!wsId) return;

        set({ membersLoading: true });

        try {
            const response = await getWorkspaceMembers(wsId);
            set({ members: response.data, membersLoading: false });
        } catch (error) {
            set({ membersLoading: false });
            throw error;
        }
    },

    // Invite member
    inviteMember: async (email: string, role: WorkspaceRole, message?: string) => {
        const { currentWorkspace } = get();
        if (!currentWorkspace) throw new Error("No workspace selected");

        await inviteWorkspaceMember(currentWorkspace.id, { email, role, message });
    },

    // Remove member
    removeMember: async (userId: string) => {
        const { currentWorkspace } = get();
        if (!currentWorkspace) throw new Error("No workspace selected");

        await removeWorkspaceMember(currentWorkspace.id, userId);

        // Update local state
        set((state) => ({
            members: state.members.filter((m) => m.userId !== userId)
        }));
    },

    // Update member role
    updateMemberRole: async (userId: string, role: WorkspaceRole) => {
        const { currentWorkspace } = get();
        if (!currentWorkspace) throw new Error("No workspace selected");

        await updateMemberRole(currentWorkspace.id, userId, role);

        // Update local state
        set((state) => ({
            members: state.members.map((m) => (m.userId === userId ? { ...m, role } : m))
        }));
    },

    // Fetch credits
    fetchCredits: async (workspaceId?: string) => {
        const wsId = workspaceId || get().currentWorkspace?.id;
        if (!wsId) return;

        set({ creditsLoading: true });

        try {
            const response = await getCreditsBalance(wsId);
            set({ creditBalance: response.data, creditsLoading: false });
        } catch (_error) {
            set({ creditsLoading: false });
            // Don't throw - credits are optional
        }
    },

    // Upgrade plan
    upgradePlan: async (plan: "free" | "pro" | "team") => {
        const { currentWorkspace } = get();
        if (!currentWorkspace) throw new Error("No workspace selected");

        const response = await upgradeWorkspace(currentWorkspace.id, plan);
        if (!response.data) {
            throw new Error("Failed to upgrade plan");
        }
        const { type, limits } = response.data;

        // Update workspace in state with new plan and limits
        const updatedWorkspace: WorkspaceWithStats = {
            ...currentWorkspace,
            type: type as "free" | "pro" | "team",
            maxWorkflows: limits.maxWorkflows,
            maxAgents: limits.maxAgents,
            maxKnowledgeBases: limits.maxKnowledgeBases,
            maxKbChunks: limits.maxKbChunks,
            maxMembers: limits.maxMembers,
            maxConnections: limits.maxConnections,
            executionHistoryDays: limits.executionHistoryDays
        };

        set((state) => {
            const updateInList = (list: WorkspaceWithStats[]) =>
                list.map((w) => (w.id === currentWorkspace.id ? updatedWorkspace : w));

            return {
                ownedWorkspaces: updateInList(state.ownedWorkspaces),
                memberWorkspaces: updateInList(state.memberWorkspaces),
                currentWorkspace: updatedWorkspace
            };
        });

        // Refresh credits (bonus credits may have been added)
        get().fetchCredits();
    },

    // Check permission
    hasPermission: (permission: WorkspacePermission) => {
        const { currentRole } = get();
        if (!currentRole) return false;
        return checkPermission(currentRole, permission);
    },

    // Get current workspace ID
    getCurrentWorkspaceId: () => {
        return get().currentWorkspace?.id || null;
    },

    // Clear error
    clearError: () => set({ error: null })
}));

// Helper function to get current workspace ID for API calls
export function getCurrentWorkspaceId(): string | null {
    return useWorkspaceStore.getState().getCurrentWorkspaceId();
}
