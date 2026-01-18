/**
 * Workspace Store Tests
 *
 * Tests for workspace state management including initialization,
 * workspace switching, member management, and permissions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { WorkspaceWithStats } from "@flowmaestro/shared";
import {
    createMockFetchResponse,
    createMockApiResponse,
    createMockWorkspace,
    mockFetchOnce
} from "../../lib/__tests__/test-helpers";
import { useWorkspaceStore, getCurrentWorkspaceId } from "../workspaceStore";

// Reset store before each test
function resetStore() {
    useWorkspaceStore.setState({
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
        error: null
    });
}

describe("workspaceStore", () => {
    beforeEach(() => {
        resetStore();
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        resetStore();
    });

    // ===== Initial State =====
    describe("initial state", () => {
        it("has correct initial state", () => {
            resetStore();
            const state = useWorkspaceStore.getState();

            expect(state.ownedWorkspaces).toEqual([]);
            expect(state.memberWorkspaces).toEqual([]);
            expect(state.currentWorkspace).toBeNull();
            expect(state.currentRole).toBeNull();
            expect(state.isOwner).toBe(false);
            expect(state.isLoading).toBe(false);
            expect(state.isInitialized).toBe(false);
            expect(state.error).toBeNull();
        });
    });

    // ===== Initialize =====
    describe("initialize", () => {
        it("fetches workspaces and sets current workspace", async () => {
            const ownedWorkspace = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        owned: [ownedWorkspace],
                        member: []
                    })
                )
            );

            // Mock credits fetch
            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ balance: 100, used: 10 }))
            );

            await useWorkspaceStore.getState().initialize();

            const state = useWorkspaceStore.getState();
            expect(state.ownedWorkspaces).toHaveLength(1);
            expect(state.currentWorkspace?.id).toBe("ws-1");
            expect(state.currentRole).toBe("owner");
            expect(state.isOwner).toBe(true);
            expect(state.isInitialized).toBe(true);
        });

        it("restores workspace from localStorage", async () => {
            const workspace1 = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;
            const workspace2 = createMockWorkspace({ id: "ws-2" }) as WorkspaceWithStats;

            localStorage.setItem("flowmaestro_current_workspace", "ws-2");

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        owned: [workspace1, workspace2],
                        member: []
                    })
                )
            );

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 100 })));

            await useWorkspaceStore.getState().initialize();

            expect(useWorkspaceStore.getState().currentWorkspace?.id).toBe("ws-2");
        });

        it("falls back to first owned workspace if saved not found", async () => {
            const ownedWorkspace = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;

            localStorage.setItem("flowmaestro_current_workspace", "nonexistent");

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        owned: [ownedWorkspace],
                        member: []
                    })
                )
            );

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 100 })));

            await useWorkspaceStore.getState().initialize();

            expect(useWorkspaceStore.getState().currentWorkspace?.id).toBe("ws-1");
        });

        it("falls back to member workspace if no owned", async () => {
            const memberWorkspace = createMockWorkspace({ id: "ws-member" }) as WorkspaceWithStats;

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        owned: [],
                        member: [memberWorkspace]
                    })
                )
            );

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 100 })));

            await useWorkspaceStore.getState().initialize();

            const state = useWorkspaceStore.getState();
            expect(state.currentWorkspace?.id).toBe("ws-member");
            expect(state.currentRole).toBe("member");
            expect(state.isOwner).toBe(false);
        });

        it("handles no workspaces", async () => {
            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ owned: [], member: [] }))
            );

            await useWorkspaceStore.getState().initialize();

            const state = useWorkspaceStore.getState();
            expect(state.currentWorkspace).toBeNull();
            expect(state.isInitialized).toBe(true);
        });

        it("prevents double initialization", async () => {
            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        owned: [createMockWorkspace()],
                        member: []
                    })
                )
            );

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 100 })));

            await useWorkspaceStore.getState().initialize();
            await useWorkspaceStore.getState().initialize();

            // Should only fetch once
            expect(fetch).toHaveBeenCalledTimes(2); // workspaces + credits
        });

        it("handles fetch error", async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            await useWorkspaceStore.getState().initialize();

            const state = useWorkspaceStore.getState();
            expect(state.error).toBe("Network error");
            expect(state.isInitialized).toBe(true);
        });
    });

    // ===== Fetch Workspaces =====
    describe("fetchWorkspaces", () => {
        it("updates workspace lists", async () => {
            const workspace = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ owned: [workspace], member: [] }))
            );

            await useWorkspaceStore.getState().fetchWorkspaces();

            expect(useWorkspaceStore.getState().ownedWorkspaces).toHaveLength(1);
        });

        it("switches workspace if current was deleted", async () => {
            const workspace1 = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;
            const workspace2 = createMockWorkspace({ id: "ws-2" }) as WorkspaceWithStats;

            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-deleted" }) as WorkspaceWithStats,
                ownedWorkspaces: [workspace1, workspace2]
            });

            mockFetchOnce(
                createMockFetchResponse(
                    createMockApiResponse({
                        owned: [workspace1, workspace2],
                        member: []
                    })
                )
            );

            // Mock switchWorkspace credits call
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 100 })));

            await useWorkspaceStore.getState().fetchWorkspaces();

            expect(useWorkspaceStore.getState().currentWorkspace?.id).toBe("ws-1");
        });
    });

    // ===== Switch Workspace =====
    describe("switchWorkspace", () => {
        beforeEach(() => {
            const workspace1 = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;
            const workspace2 = createMockWorkspace({ id: "ws-2" }) as WorkspaceWithStats;

            useWorkspaceStore.setState({
                ownedWorkspaces: [workspace1],
                memberWorkspaces: [workspace2],
                currentWorkspace: workspace1,
                currentRole: "owner",
                isOwner: true
            });
        });

        it("switches to workspace and updates localStorage", async () => {
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 50 })));

            await useWorkspaceStore.getState().switchWorkspace("ws-2");

            const state = useWorkspaceStore.getState();
            expect(state.currentWorkspace?.id).toBe("ws-2");
            expect(state.currentRole).toBe("member");
            expect(state.isOwner).toBe(false);
            expect(localStorage.getItem("flowmaestro_current_workspace")).toBe("ws-2");
        });

        it("clears members and credits when switching", async () => {
            useWorkspaceStore.setState({
                members: [{ userId: "user-1", role: "member" }] as never[],
                creditBalance: { balance: 100 } as never
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 50 })));

            await useWorkspaceStore.getState().switchWorkspace("ws-2");

            const state = useWorkspaceStore.getState();
            expect(state.members).toHaveLength(0);
            expect(state.creditBalance).toBeNull();
        });

        it("throws error for non-existent workspace", async () => {
            await expect(
                useWorkspaceStore.getState().switchWorkspace("nonexistent")
            ).rejects.toThrow("Workspace not found");
        });
    });

    // ===== Set Current Workspace =====
    describe("setCurrentWorkspace", () => {
        it("sets workspace and role directly", () => {
            const workspace = createMockWorkspace({ id: "ws-new" }) as WorkspaceWithStats;

            useWorkspaceStore.getState().setCurrentWorkspace(workspace, "admin");

            const state = useWorkspaceStore.getState();
            expect(state.currentWorkspace?.id).toBe("ws-new");
            expect(state.currentRole).toBe("admin");
            expect(localStorage.getItem("flowmaestro_current_workspace")).toBe("ws-new");
        });

        it("sets isOwner based on role", () => {
            const workspace = createMockWorkspace() as WorkspaceWithStats;

            useWorkspaceStore.getState().setCurrentWorkspace(workspace, "owner");
            expect(useWorkspaceStore.getState().isOwner).toBe(true);

            useWorkspaceStore.getState().setCurrentWorkspace(workspace, "member");
            expect(useWorkspaceStore.getState().isOwner).toBe(false);
        });
    });

    // ===== Workspace CRUD =====
    describe("createWorkspace", () => {
        it("creates workspace and adds to owned list", async () => {
            const newWorkspace = createMockWorkspace({ id: "ws-new", name: "New Workspace" });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse(newWorkspace)));

            const result = await useWorkspaceStore
                .getState()
                .createWorkspace("New Workspace", "Description", "personal");

            expect(result.name).toBe("New Workspace");
            expect(useWorkspaceStore.getState().ownedWorkspaces).toHaveLength(1);
        });
    });

    describe("updateWorkspace", () => {
        it("updates workspace in local state", async () => {
            const workspace = createMockWorkspace({
                id: "ws-1",
                name: "Original"
            }) as WorkspaceWithStats;
            useWorkspaceStore.setState({
                ownedWorkspaces: [workspace],
                currentWorkspace: workspace
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            await useWorkspaceStore.getState().updateWorkspace("ws-1", { name: "Updated" });

            const state = useWorkspaceStore.getState();
            expect(state.ownedWorkspaces[0].name).toBe("Updated");
            expect(state.currentWorkspace?.name).toBe("Updated");
        });
    });

    describe("deleteWorkspace", () => {
        it("removes workspace from local state", async () => {
            const workspace1 = createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats;
            const workspace2 = createMockWorkspace({ id: "ws-2" }) as WorkspaceWithStats;

            useWorkspaceStore.setState({
                ownedWorkspaces: [workspace1, workspace2],
                currentWorkspace: workspace1
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            // Mock switchWorkspace credits call
            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ balance: 100 })));

            await useWorkspaceStore.getState().deleteWorkspace("ws-1");

            const state = useWorkspaceStore.getState();
            expect(state.ownedWorkspaces).toHaveLength(1);
            expect(state.currentWorkspace?.id).toBe("ws-2");
        });
    });

    // ===== Members =====
    describe("fetchMembers", () => {
        it("fetches members for current workspace", async () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats
            });

            const members = [
                { userId: "user-1", role: "owner" },
                { userId: "user-2", role: "member" }
            ];

            mockFetchOnce(createMockFetchResponse(createMockApiResponse(members)));

            await useWorkspaceStore.getState().fetchMembers();

            expect(useWorkspaceStore.getState().members).toHaveLength(2);
        });

        it("does nothing without current workspace", async () => {
            await useWorkspaceStore.getState().fetchMembers();

            expect(fetch).not.toHaveBeenCalled();
        });
    });

    describe("inviteMember", () => {
        it("invites member to workspace", async () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            await useWorkspaceStore
                .getState()
                .inviteMember("new@example.com", "member", "Join us!");

            expect(fetch).toHaveBeenCalled();
        });

        it("throws without current workspace", async () => {
            await expect(
                useWorkspaceStore.getState().inviteMember("test@example.com", "member")
            ).rejects.toThrow("No workspace selected");
        });
    });

    describe("removeMember", () => {
        it("removes member and updates local state", async () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats,
                members: [
                    { userId: "user-1", role: "owner" },
                    { userId: "user-2", role: "member" }
                ] as never[]
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            await useWorkspaceStore.getState().removeMember("user-2");

            expect(useWorkspaceStore.getState().members).toHaveLength(1);
        });
    });

    describe("updateMemberRole", () => {
        it("updates member role in local state", async () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats,
                members: [{ userId: "user-1", role: "member" }] as never[]
            });

            mockFetchOnce(createMockFetchResponse(createMockApiResponse({ success: true })));

            await useWorkspaceStore.getState().updateMemberRole("user-1", "admin");

            expect(useWorkspaceStore.getState().members[0].role).toBe("admin");
        });
    });

    // ===== Credits =====
    describe("fetchCredits", () => {
        it("fetches credits for current workspace", async () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats
            });

            mockFetchOnce(
                createMockFetchResponse(createMockApiResponse({ balance: 100, used: 25 }))
            );

            await useWorkspaceStore.getState().fetchCredits();

            const state = useWorkspaceStore.getState();
            expect(state.creditBalance?.balance).toBe(100);
            expect(state.creditsLoading).toBe(false);
        });

        it("handles fetch error gracefully", async () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-1" }) as WorkspaceWithStats
            });

            vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

            // Should not throw
            await useWorkspaceStore.getState().fetchCredits();

            expect(useWorkspaceStore.getState().creditsLoading).toBe(false);
        });
    });

    // ===== Permissions =====
    describe("hasPermission", () => {
        it("returns true for allowed permissions", () => {
            useWorkspaceStore.setState({ currentRole: "owner" });

            expect(useWorkspaceStore.getState().hasPermission("create")).toBe(true);
            expect(useWorkspaceStore.getState().hasPermission("delete_workspace")).toBe(true);
        });

        it("returns false without role", () => {
            useWorkspaceStore.setState({ currentRole: null });

            expect(useWorkspaceStore.getState().hasPermission("create")).toBe(false);
        });

        it("respects role-based permissions", () => {
            useWorkspaceStore.setState({ currentRole: "viewer" });

            expect(useWorkspaceStore.getState().hasPermission("view")).toBe(true);
            expect(useWorkspaceStore.getState().hasPermission("delete")).toBe(false);
        });
    });

    // ===== getCurrentWorkspaceId Helper =====
    describe("getCurrentWorkspaceId", () => {
        it("returns current workspace ID", () => {
            useWorkspaceStore.setState({
                currentWorkspace: createMockWorkspace({ id: "ws-123" }) as WorkspaceWithStats
            });

            expect(getCurrentWorkspaceId()).toBe("ws-123");
        });

        it("returns null without workspace", () => {
            expect(getCurrentWorkspaceId()).toBeNull();
        });
    });

    // ===== Clear Error =====
    describe("clearError", () => {
        it("clears error state", () => {
            useWorkspaceStore.setState({ error: "Some error" });

            useWorkspaceStore.getState().clearError();

            expect(useWorkspaceStore.getState().error).toBeNull();
        });
    });
});
