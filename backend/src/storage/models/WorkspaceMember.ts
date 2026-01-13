import type { WorkspaceRole } from "@flowmaestro/shared";

export interface WorkspaceMemberModel {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    invited_by: string | null;
    invited_at: Date | null;
    accepted_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface CreateWorkspaceMemberInput {
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    invited_by?: string;
    invited_at?: Date;
    accepted_at?: Date;
}

export interface UpdateWorkspaceMemberInput {
    role?: WorkspaceRole;
    accepted_at?: Date;
}
