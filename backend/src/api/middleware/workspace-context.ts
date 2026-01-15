import { FastifyRequest, FastifyReply } from "fastify";
import type { WorkspaceContext, WorkspaceType, WorkspaceRole } from "@flowmaestro/shared";
import { WorkspaceMemberRepository } from "../../storage/repositories/WorkspaceMemberRepository";
import { WorkspaceRepository } from "../../storage/repositories/WorkspaceRepository";
import { BadRequestError, ForbiddenError, NotFoundError } from "./error-handler";

// Extend FastifyRequest to include workspace context
declare module "fastify" {
    interface FastifyRequest {
        workspace?: WorkspaceContext;
    }
}

/**
 * Middleware to extract and validate workspace context from request.
 *
 * Gets workspace ID from:
 * 1. Route param (:workspaceId)
 * 2. X-Workspace-Id header
 * 3. Query param (workspaceId) - for SSE/EventSource which can't send headers
 *
 * Validates that:
 * - Workspace exists and is not deleted
 * - User is a member of the workspace
 *
 * Attaches workspace context to request.workspace
 */
export async function workspaceContextMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    // Get workspace ID from route param, header, or query param
    const params = request.params as { workspaceId?: string };
    const query = request.query as { workspaceId?: string };
    const workspaceId =
        params.workspaceId ||
        (request.headers["x-workspace-id"] as string | undefined) ||
        query.workspaceId;

    if (!workspaceId) {
        throw new BadRequestError("Workspace ID is required");
    }

    const userId = request.user?.id;
    if (!userId) {
        throw new ForbiddenError("Authentication required");
    }

    const workspaceRepo = new WorkspaceRepository();
    const memberRepo = new WorkspaceMemberRepository();

    // Fetch workspace and membership in parallel
    const [workspace, membership] = await Promise.all([
        workspaceRepo.findById(workspaceId),
        memberRepo.findByWorkspaceAndUser(workspaceId, userId)
    ]);

    // Validate workspace exists
    if (!workspace) {
        throw new NotFoundError("Workspace not found");
    }

    // Validate user is a member
    if (!membership) {
        throw new ForbiddenError("You are not a member of this workspace");
    }

    // Attach workspace context to request
    request.workspace = {
        id: workspace.id,
        type: workspace.type as WorkspaceType,
        role: membership.role as WorkspaceRole,
        isOwner: membership.role === "owner",
        limits: {
            maxWorkflows: workspace.max_workflows,
            maxAgents: workspace.max_agents,
            maxKnowledgeBases: workspace.max_knowledge_bases,
            maxKbChunks: workspace.max_kb_chunks,
            maxMembers: workspace.max_members,
            maxConnections: workspace.max_connections
        }
    };
}

/**
 * Optional workspace context middleware.
 * Does not fail if workspace ID is not provided.
 * Useful for routes that work with or without workspace context.
 */
export async function optionalWorkspaceContextMiddleware(
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> {
    const params = request.params as { workspaceId?: string };
    const workspaceId =
        params.workspaceId || (request.headers["x-workspace-id"] as string | undefined);

    if (!workspaceId) {
        return; // No workspace context, continue without it
    }

    const userId = request.user?.id;
    if (!userId) {
        return; // No user, skip workspace context
    }

    try {
        const workspaceRepo = new WorkspaceRepository();
        const memberRepo = new WorkspaceMemberRepository();

        const [workspace, membership] = await Promise.all([
            workspaceRepo.findById(workspaceId),
            memberRepo.findByWorkspaceAndUser(workspaceId, userId)
        ]);

        if (workspace && membership) {
            request.workspace = {
                id: workspace.id,
                type: workspace.type as WorkspaceType,
                role: membership.role as WorkspaceRole,
                isOwner: membership.role === "owner",
                limits: {
                    maxWorkflows: workspace.max_workflows,
                    maxAgents: workspace.max_agents,
                    maxKnowledgeBases: workspace.max_knowledge_bases,
                    maxKbChunks: workspace.max_kb_chunks,
                    maxMembers: workspace.max_members,
                    maxConnections: workspace.max_connections
                }
            };
        }
    } catch {
        // Silently fail - workspace context is optional
    }
}
