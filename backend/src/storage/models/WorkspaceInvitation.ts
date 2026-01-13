import type { WorkspaceRole, InvitationStatus } from "@flowmaestro/shared";

export interface WorkspaceInvitationModel {
    id: string;
    workspace_id: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invited_by: string;
    message: string | null;
    status: InvitationStatus;
    expires_at: Date;
    accepted_at: Date | null;
    created_at: Date;
}

export interface CreateWorkspaceInvitationInput {
    workspace_id: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invited_by: string;
    message?: string;
    expires_at?: Date;
}

export interface UpdateWorkspaceInvitationInput {
    status?: InvitationStatus;
    accepted_at?: Date;
}
