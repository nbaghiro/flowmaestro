import type {
    WorkspaceRole,
    InvitationStatus,
    WorkspaceInvitation,
    WorkspaceInvitationWithDetails
} from "@flowmaestro/shared";
import { db } from "../database";
import {
    WorkspaceInvitationModel,
    CreateWorkspaceInvitationInput,
    UpdateWorkspaceInvitationInput
} from "../models/WorkspaceInvitation";

interface WorkspaceInvitationRow {
    id: string;
    workspace_id: string;
    email: string;
    role: WorkspaceRole;
    token: string;
    invited_by: string;
    message: string | null;
    status: InvitationStatus;
    expires_at: string | Date;
    accepted_at: string | Date | null;
    created_at: string | Date;
}

interface WorkspaceInvitationWithDetailsRow extends WorkspaceInvitationRow {
    workspace_name: string;
    workspace_slug: string;
    inviter_name: string | null;
    inviter_email: string;
}

export class WorkspaceInvitationRepository {
    async create(input: CreateWorkspaceInvitationInput): Promise<WorkspaceInvitationModel> {
        const expiresAt = input.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const query = `
            INSERT INTO flowmaestro.workspace_invitations (
                workspace_id, email, role, token, invited_by, message, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.workspace_id,
            input.email.toLowerCase(),
            input.role,
            input.token,
            input.invited_by,
            input.message || null,
            expiresAt
        ];

        const result = await db.query<WorkspaceInvitationRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<WorkspaceInvitationModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE id = $1
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByToken(token: string): Promise<WorkspaceInvitationModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE token = $1
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [token]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByTokenWithDetails(token: string): Promise<WorkspaceInvitationWithDetails | null> {
        const query = `
            SELECT
                wi.*,
                w.name as workspace_name,
                w.slug as workspace_slug,
                u.name as inviter_name,
                u.email as inviter_email
            FROM flowmaestro.workspace_invitations wi
            INNER JOIN flowmaestro.workspaces w ON wi.workspace_id = w.id
            INNER JOIN flowmaestro.users u ON wi.invited_by = u.id
            WHERE wi.token = $1
        `;

        const result = await db.query<WorkspaceInvitationWithDetailsRow>(query, [token]);
        return result.rows.length > 0 ? this.mapRowWithDetails(result.rows[0]) : null;
    }

    async findByWorkspaceId(workspaceId: string): Promise<WorkspaceInvitationModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE workspace_id = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [workspaceId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findPendingByWorkspaceId(workspaceId: string): Promise<WorkspaceInvitationModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE workspace_id = $1 AND status = 'pending' AND expires_at > NOW()
            ORDER BY created_at DESC
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [workspaceId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByEmail(email: string): Promise<WorkspaceInvitationModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE email = $1
            ORDER BY created_at DESC
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [email.toLowerCase()]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findPendingByEmail(email: string): Promise<WorkspaceInvitationModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
            ORDER BY created_at DESC
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [email.toLowerCase()]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findPendingByWorkspaceAndEmail(
        workspaceId: string,
        email: string
    ): Promise<WorkspaceInvitationModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_invitations
            WHERE workspace_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()
            LIMIT 1
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [
            workspaceId,
            email.toLowerCase()
        ]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async update(
        id: string,
        input: UpdateWorkspaceInvitationInput
    ): Promise<WorkspaceInvitationModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }
        if (input.accepted_at !== undefined) {
            updates.push(`accepted_at = $${paramIndex++}`);
            values.push(input.accepted_at);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.workspace_invitations
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async markAsAccepted(id: string): Promise<WorkspaceInvitationModel | null> {
        const query = `
            UPDATE flowmaestro.workspace_invitations
            SET status = 'accepted', accepted_at = NOW()
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async markAsDeclined(id: string): Promise<WorkspaceInvitationModel | null> {
        const query = `
            UPDATE flowmaestro.workspace_invitations
            SET status = 'declined'
            WHERE id = $1
            RETURNING *
        `;

        const result = await db.query<WorkspaceInvitationRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workspace_invitations
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async expireOldInvitations(): Promise<number> {
        const query = `
            UPDATE flowmaestro.workspace_invitations
            SET status = 'expired'
            WHERE status = 'pending' AND expires_at <= NOW()
        `;

        const result = await db.query(query);
        return result.rowCount || 0;
    }

    private mapRow(row: WorkspaceInvitationRow): WorkspaceInvitationModel {
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            email: row.email,
            role: row.role,
            token: row.token,
            invited_by: row.invited_by,
            message: row.message,
            status: row.status,
            expires_at: new Date(row.expires_at),
            accepted_at: row.accepted_at ? new Date(row.accepted_at) : null,
            created_at: new Date(row.created_at)
        };
    }

    private mapRowWithDetails(
        row: WorkspaceInvitationWithDetailsRow
    ): WorkspaceInvitationWithDetails {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            email: row.email,
            role: row.role,
            token: row.token,
            invitedBy: row.invited_by,
            message: row.message,
            status: row.status,
            expiresAt: new Date(row.expires_at),
            acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
            createdAt: new Date(row.created_at),
            workspace: {
                id: row.workspace_id,
                name: row.workspace_name,
                slug: row.workspace_slug
            },
            inviter: {
                id: row.invited_by,
                name: row.inviter_name,
                email: row.inviter_email
            }
        };
    }

    // Convert model to shared type
    modelToShared(model: WorkspaceInvitationModel): WorkspaceInvitation {
        return {
            id: model.id,
            workspaceId: model.workspace_id,
            email: model.email,
            role: model.role,
            token: model.token,
            invitedBy: model.invited_by,
            message: model.message,
            status: model.status,
            expiresAt: model.expires_at,
            acceptedAt: model.accepted_at,
            createdAt: model.created_at
        };
    }
}
