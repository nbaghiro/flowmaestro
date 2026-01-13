import { FastifyRequest, FastifyReply } from "fastify";
import { hasPermission, WorkspacePermission } from "@flowmaestro/shared";
import { ForbiddenError, BadRequestError } from "./error-handler";

/**
 * Creates a middleware that checks if the user has the required permission
 * in the current workspace context.
 *
 * Usage:
 *   preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("edit")]
 *
 * @param permission - The permission to check
 * @returns Fastify preHandler middleware
 */
export function requirePermission(permission: WorkspacePermission) {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        const workspace = request.workspace;

        if (!workspace) {
            throw new BadRequestError("Workspace context is required");
        }

        if (!hasPermission(workspace.role, permission)) {
            throw new ForbiddenError(
                `You don't have permission to ${permission.replace(/_/g, " ")} in this workspace`
            );
        }
    };
}

/**
 * Creates a middleware that checks if the user has ANY of the required permissions.
 *
 * @param permissions - Array of permissions, user needs at least one
 * @returns Fastify preHandler middleware
 */
export function requireAnyPermission(permissions: WorkspacePermission[]) {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        const workspace = request.workspace;

        if (!workspace) {
            throw new BadRequestError("Workspace context is required");
        }

        const hasAny = permissions.some((p) => hasPermission(workspace.role, p));

        if (!hasAny) {
            throw new ForbiddenError(
                "You don't have permission to perform this action in this workspace"
            );
        }
    };
}

/**
 * Creates a middleware that checks if the user has ALL of the required permissions.
 *
 * @param permissions - Array of permissions, user needs all of them
 * @returns Fastify preHandler middleware
 */
export function requireAllPermissions(permissions: WorkspacePermission[]) {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
        const workspace = request.workspace;

        if (!workspace) {
            throw new BadRequestError("Workspace context is required");
        }

        const hasAll = permissions.every((p) => hasPermission(workspace.role, p));

        if (!hasAll) {
            throw new ForbiddenError(
                "You don't have all required permissions to perform this action"
            );
        }
    };
}

/**
 * Middleware that requires the user to be the workspace owner.
 */
export async function requireOwner(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const workspace = request.workspace;

    if (!workspace) {
        throw new BadRequestError("Workspace context is required");
    }

    if (!workspace.isOwner) {
        throw new ForbiddenError("Only the workspace owner can perform this action");
    }
}

/**
 * Middleware that requires the user to be at least an admin.
 */
export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const workspace = request.workspace;

    if (!workspace) {
        throw new BadRequestError("Workspace context is required");
    }

    if (workspace.role !== "owner" && workspace.role !== "admin") {
        throw new ForbiddenError("Admin access required for this action");
    }
}

/**
 * Check if a role can manage another role.
 * - Owner can manage all roles
 * - Admin can manage member and viewer, but not owner or other admins
 * - Member and viewer cannot manage roles
 */
export function canManageRole(actorRole: string, targetRole: string): boolean {
    if (actorRole === "owner") {
        return true;
    }

    if (actorRole === "admin") {
        return targetRole === "member" || targetRole === "viewer";
    }

    return false;
}

/**
 * Check if a role can assign another role.
 * - Owner can assign any role except owner
 * - Admin can assign member and viewer
 */
export function canAssignRole(actorRole: string, targetRole: string): boolean {
    if (actorRole === "owner") {
        return targetRole !== "owner"; // Cannot assign owner role
    }

    if (actorRole === "admin") {
        return targetRole === "member" || targetRole === "viewer";
    }

    return false;
}
