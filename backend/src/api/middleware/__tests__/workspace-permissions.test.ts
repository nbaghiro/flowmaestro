/**
 * Workspace Permissions Middleware Tests
 *
 * Tests for workspace permission checking middleware (workspace-permissions.ts)
 */

import {
    createMockRequest,
    createMockReply,
    createMockWorkspaceContext,
    assertThrowsError
} from "../../../../__tests__/helpers/middleware-test-utils";
import {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireOwner,
    requireAdmin,
    canManageRole,
    canAssignRole
} from "../workspace-permissions";

// Mock the hasPermission function from shared
jest.mock("@flowmaestro/shared", () => ({
    hasPermission: jest.fn((role: string, permission: string) => {
        // Simplified permission matrix for testing using valid WorkspacePermission values
        const permissions: Record<string, string[]> = {
            owner: [
                "view",
                "create",
                "edit",
                "delete",
                "execute",
                "invite_members",
                "remove_members",
                "change_roles",
                "edit_settings",
                "view_billing",
                "manage_billing",
                "delete_workspace",
                "transfer_ownership"
            ],
            admin: [
                "view",
                "create",
                "edit",
                "delete",
                "execute",
                "invite_members",
                "remove_members",
                "change_roles",
                "edit_settings",
                "view_billing"
            ],
            member: ["view", "create", "edit", "execute"],
            viewer: ["view"]
        };
        return permissions[role]?.includes(permission) ?? false;
    })
}));

describe("requirePermission", () => {
    describe("Single permission check", () => {
        it("should pass when owner has the permission", async () => {
            const middleware = requirePermission("delete");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "owner", isOwner: true })
            });
            const reply = createMockReply();

            await expect(middleware(request, reply)).resolves.toBeUndefined();
        });

        it("should pass when admin has the permission", async () => {
            const middleware = requirePermission("edit");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "admin", isOwner: false })
            });
            const reply = createMockReply();

            await expect(middleware(request, reply)).resolves.toBeUndefined();
        });

        it("should pass when member has the permission", async () => {
            const middleware = requirePermission("view");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
            });
            const reply = createMockReply();

            await expect(middleware(request, reply)).resolves.toBeUndefined();
        });

        it("should pass when viewer has the permission", async () => {
            const middleware = requirePermission("view");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
            });
            const reply = createMockReply();

            await expect(middleware(request, reply)).resolves.toBeUndefined();
        });

        it("should fail when viewer lacks the permission", async () => {
            const middleware = requirePermission("edit");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
            });

            await assertThrowsError(
                () => middleware(request, createMockReply()),
                "ForbiddenError",
                /permission to edit/
            );
        });

        it("should fail when member lacks the permission", async () => {
            const middleware = requirePermission("remove_members");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
            });

            await assertThrowsError(
                () => middleware(request, createMockReply()),
                "ForbiddenError",
                /permission to remove members/
            );
        });
    });

    describe("Error cases", () => {
        it("should fail when workspace context is missing", async () => {
            const middleware = requirePermission("view");
            const request = createMockRequest({
                workspace: undefined
            });

            await assertThrowsError(
                () => middleware(request, createMockReply()),
                "BadRequestError",
                /Workspace context is required/
            );
        });
    });

    describe("Permission formatting in error message", () => {
        it("should replace underscores with spaces in error message", async () => {
            const middleware = requirePermission("remove_members");
            const request = createMockRequest({
                workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
            });

            await assertThrowsError(
                () => middleware(request, createMockReply()),
                "ForbiddenError",
                /permission to remove members/
            );
        });
    });
});

describe("requireAnyPermission", () => {
    it("should pass when user has first permission", async () => {
        const middleware = requireAnyPermission(["delete", "edit_settings"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "admin", isOwner: false })
        });
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
    });

    it("should pass when user has second permission", async () => {
        const middleware = requireAnyPermission(["edit_settings", "view"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
        });
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
    });

    it("should pass when user has all permissions", async () => {
        const middleware = requireAnyPermission(["view", "create", "edit"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
        });
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
    });

    it("should fail when user has none of the permissions", async () => {
        const middleware = requireAnyPermission(["delete", "remove_members", "edit_settings"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
        });

        await assertThrowsError(
            () => middleware(request, createMockReply()),
            "ForbiddenError",
            /don't have permission/
        );
    });

    it("should fail when workspace context is missing", async () => {
        const middleware = requireAnyPermission(["view"]);
        const request = createMockRequest({
            workspace: undefined
        });

        await assertThrowsError(
            () => middleware(request, createMockReply()),
            "BadRequestError",
            /Workspace context is required/
        );
    });
});

describe("requireAllPermissions", () => {
    it("should pass when user has all permissions", async () => {
        const middleware = requireAllPermissions(["view", "create", "edit"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
        });
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
    });

    it("should fail when user lacks one permission", async () => {
        const middleware = requireAllPermissions(["view", "create", "delete"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
        });

        await assertThrowsError(
            () => middleware(request, createMockReply()),
            "ForbiddenError",
            /don't have all required permissions/
        );
    });

    it("should fail when user lacks all permissions", async () => {
        const middleware = requireAllPermissions(["create", "edit", "delete"]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
        });

        await assertThrowsError(
            () => middleware(request, createMockReply()),
            "ForbiddenError",
            /don't have all required permissions/
        );
    });

    it("should pass with empty permission array", async () => {
        const middleware = requireAllPermissions([]);
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
        });
        const reply = createMockReply();

        await expect(middleware(request, reply)).resolves.toBeUndefined();
    });

    it("should fail when workspace context is missing", async () => {
        const middleware = requireAllPermissions(["view"]);
        const request = createMockRequest({
            workspace: undefined
        });

        await assertThrowsError(
            () => middleware(request, createMockReply()),
            "BadRequestError",
            /Workspace context is required/
        );
    });
});

describe("requireOwner", () => {
    it("should pass when user is owner", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "owner", isOwner: true })
        });
        const reply = createMockReply();

        await expect(requireOwner(request, reply)).resolves.toBeUndefined();
    });

    it("should fail when user is admin", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "admin", isOwner: false })
        });

        await assertThrowsError(
            () => requireOwner(request, createMockReply()),
            "ForbiddenError",
            /Only the workspace owner/
        );
    });

    it("should fail when user is member", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
        });

        await assertThrowsError(
            () => requireOwner(request, createMockReply()),
            "ForbiddenError",
            /Only the workspace owner/
        );
    });

    it("should fail when user is viewer", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
        });

        await assertThrowsError(
            () => requireOwner(request, createMockReply()),
            "ForbiddenError",
            /Only the workspace owner/
        );
    });

    it("should fail when workspace context is missing", async () => {
        const request = createMockRequest({
            workspace: undefined
        });

        await assertThrowsError(
            () => requireOwner(request, createMockReply()),
            "BadRequestError",
            /Workspace context is required/
        );
    });
});

describe("requireAdmin", () => {
    it("should pass when user is owner", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "owner", isOwner: true })
        });
        const reply = createMockReply();

        await expect(requireAdmin(request, reply)).resolves.toBeUndefined();
    });

    it("should pass when user is admin", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "admin", isOwner: false })
        });
        const reply = createMockReply();

        await expect(requireAdmin(request, reply)).resolves.toBeUndefined();
    });

    it("should fail when user is member", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "member", isOwner: false })
        });

        await assertThrowsError(
            () => requireAdmin(request, createMockReply()),
            "ForbiddenError",
            /Admin access required/
        );
    });

    it("should fail when user is viewer", async () => {
        const request = createMockRequest({
            workspace: createMockWorkspaceContext({ role: "viewer", isOwner: false })
        });

        await assertThrowsError(
            () => requireAdmin(request, createMockReply()),
            "ForbiddenError",
            /Admin access required/
        );
    });

    it("should fail when workspace context is missing", async () => {
        const request = createMockRequest({
            workspace: undefined
        });

        await assertThrowsError(
            () => requireAdmin(request, createMockReply()),
            "BadRequestError",
            /Workspace context is required/
        );
    });
});

describe("canManageRole", () => {
    describe("Owner permissions", () => {
        it("should allow owner to manage owner role", () => {
            expect(canManageRole("owner", "owner")).toBe(true);
        });

        it("should allow owner to manage admin role", () => {
            expect(canManageRole("owner", "admin")).toBe(true);
        });

        it("should allow owner to manage member role", () => {
            expect(canManageRole("owner", "member")).toBe(true);
        });

        it("should allow owner to manage viewer role", () => {
            expect(canManageRole("owner", "viewer")).toBe(true);
        });
    });

    describe("Admin permissions", () => {
        it("should not allow admin to manage owner role", () => {
            expect(canManageRole("admin", "owner")).toBe(false);
        });

        it("should not allow admin to manage admin role", () => {
            expect(canManageRole("admin", "admin")).toBe(false);
        });

        it("should allow admin to manage member role", () => {
            expect(canManageRole("admin", "member")).toBe(true);
        });

        it("should allow admin to manage viewer role", () => {
            expect(canManageRole("admin", "viewer")).toBe(true);
        });
    });

    describe("Member permissions", () => {
        it("should not allow member to manage any role", () => {
            expect(canManageRole("member", "owner")).toBe(false);
            expect(canManageRole("member", "admin")).toBe(false);
            expect(canManageRole("member", "member")).toBe(false);
            expect(canManageRole("member", "viewer")).toBe(false);
        });
    });

    describe("Viewer permissions", () => {
        it("should not allow viewer to manage any role", () => {
            expect(canManageRole("viewer", "owner")).toBe(false);
            expect(canManageRole("viewer", "admin")).toBe(false);
            expect(canManageRole("viewer", "member")).toBe(false);
            expect(canManageRole("viewer", "viewer")).toBe(false);
        });
    });
});

describe("canAssignRole", () => {
    describe("Owner permissions", () => {
        it("should not allow owner to assign owner role", () => {
            expect(canAssignRole("owner", "owner")).toBe(false);
        });

        it("should allow owner to assign admin role", () => {
            expect(canAssignRole("owner", "admin")).toBe(true);
        });

        it("should allow owner to assign member role", () => {
            expect(canAssignRole("owner", "member")).toBe(true);
        });

        it("should allow owner to assign viewer role", () => {
            expect(canAssignRole("owner", "viewer")).toBe(true);
        });
    });

    describe("Admin permissions", () => {
        it("should not allow admin to assign owner role", () => {
            expect(canAssignRole("admin", "owner")).toBe(false);
        });

        it("should not allow admin to assign admin role", () => {
            expect(canAssignRole("admin", "admin")).toBe(false);
        });

        it("should allow admin to assign member role", () => {
            expect(canAssignRole("admin", "member")).toBe(true);
        });

        it("should allow admin to assign viewer role", () => {
            expect(canAssignRole("admin", "viewer")).toBe(true);
        });
    });

    describe("Member permissions", () => {
        it("should not allow member to assign any role", () => {
            expect(canAssignRole("member", "owner")).toBe(false);
            expect(canAssignRole("member", "admin")).toBe(false);
            expect(canAssignRole("member", "member")).toBe(false);
            expect(canAssignRole("member", "viewer")).toBe(false);
        });
    });

    describe("Viewer permissions", () => {
        it("should not allow viewer to assign any role", () => {
            expect(canAssignRole("viewer", "owner")).toBe(false);
            expect(canAssignRole("viewer", "admin")).toBe(false);
            expect(canAssignRole("viewer", "member")).toBe(false);
            expect(canAssignRole("viewer", "viewer")).toBe(false);
        });
    });
});
