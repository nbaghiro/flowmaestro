import { randomBytes } from "crypto";
import { FastifyInstance } from "fastify";
import type { InviteMemberInput } from "@flowmaestro/shared";
import { createServiceLogger } from "../../../../core/logging";
import { emailService } from "../../../../services/email/EmailService";
import { UserRepository } from "../../../../storage/repositories/UserRepository";
import { WorkspaceInvitationRepository } from "../../../../storage/repositories/WorkspaceInvitationRepository";
import { WorkspaceMemberRepository } from "../../../../storage/repositories/WorkspaceMemberRepository";
import { WorkspaceRepository } from "../../../../storage/repositories/WorkspaceRepository";
import {
    authMiddleware,
    workspaceContextMiddleware,
    requirePermission,
    canAssignRole
} from "../../../middleware";

const logger = createServiceLogger("WorkspaceMemberRoutes");

export async function inviteMemberRoute(fastify: FastifyInstance) {
    fastify.post<{
        Params: { workspaceId: string };
        Body: InviteMemberInput;
    }>(
        "/:workspaceId/members/invite",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("invite_members")
            ]
        },
        async (request, reply) => {
            const { workspaceId } = request.params;
            const userId = request.user!.id;
            const body = request.body;

            try {
                // Validate email
                if (!body.email || !body.email.includes("@")) {
                    return reply.status(400).send({
                        success: false,
                        error: "Valid email is required"
                    });
                }

                // Validate role
                const validRoles = ["admin", "member", "viewer"];
                if (!validRoles.includes(body.role)) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid role. Must be admin, member, or viewer"
                    });
                }

                // Check if actor can assign this role
                if (!canAssignRole(request.workspace!.role, body.role)) {
                    return reply.status(403).send({
                        success: false,
                        error: "You cannot assign this role"
                    });
                }

                const memberRepo = new WorkspaceMemberRepository();
                const invitationRepo = new WorkspaceInvitationRepository();
                const workspaceRepo = new WorkspaceRepository();
                const userRepo = new UserRepository();

                // Check workspace member limit
                const workspace = await workspaceRepo.findById(workspaceId);
                if (!workspace) {
                    return reply.status(404).send({
                        success: false,
                        error: "Workspace not found"
                    });
                }

                const memberCount = await memberRepo.getMemberCount(workspaceId);
                if (workspace.max_members !== -1 && memberCount >= workspace.max_members) {
                    return reply.status(400).send({
                        success: false,
                        error: "Workspace has reached its member limit. Please upgrade to add more members."
                    });
                }

                // Check if user is already a member
                const existingUser = await userRepo.findByEmail(body.email.toLowerCase());
                if (existingUser) {
                    const existingMember = await memberRepo.findByWorkspaceAndUser(
                        workspaceId,
                        existingUser.id
                    );
                    if (existingMember) {
                        return reply.status(400).send({
                            success: false,
                            error: "This user is already a member of the workspace"
                        });
                    }
                }

                // Check for existing pending invitation
                const existingInvitation = await invitationRepo.findPendingByWorkspaceAndEmail(
                    workspaceId,
                    body.email
                );
                if (existingInvitation) {
                    return reply.status(400).send({
                        success: false,
                        error: "An invitation has already been sent to this email"
                    });
                }

                // Generate unique token
                const token = randomBytes(32).toString("hex");

                // Create invitation
                const invitation = await invitationRepo.create({
                    workspace_id: workspaceId,
                    email: body.email.toLowerCase(),
                    role: body.role,
                    token,
                    invited_by: userId,
                    message: body.message
                });

                logger.info(
                    { workspaceId, email: body.email, role: body.role },
                    "Member invitation created"
                );

                // Send invitation email
                const inviter = await userRepo.findById(userId);
                try {
                    await emailService.sendWorkspaceInvitation(
                        body.email.toLowerCase(),
                        token,
                        workspace.name,
                        inviter?.name || "A team member",
                        inviter?.email || "unknown",
                        body.role,
                        existingUser?.name || undefined,
                        body.message || undefined
                    );
                    logger.info({ workspaceId, email: body.email }, "Invitation email sent");
                } catch (emailError) {
                    // Log but don't fail - invitation is still created
                    logger.error(
                        { workspaceId, email: body.email, error: emailError },
                        "Failed to send invitation email"
                    );
                }

                return reply.status(201).send({
                    success: true,
                    data: {
                        id: invitation.id,
                        email: invitation.email,
                        role: invitation.role,
                        status: invitation.status,
                        expiresAt: invitation.expires_at,
                        createdAt: invitation.created_at
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, body, error }, "Error inviting member");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
