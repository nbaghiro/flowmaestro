import type { WorkspaceRole, WorkspaceMember, WorkspaceMemberWithUser } from "@flowmaestro/shared";
import { db } from "../database";
import {
    WorkspaceMemberModel,
    CreateWorkspaceMemberInput,
    UpdateWorkspaceMemberInput
} from "../models/WorkspaceMember";

interface WorkspaceMemberRow {
    id: string;
    workspace_id: string;
    user_id: string;
    role: WorkspaceRole;
    invited_by: string | null;
    invited_at: string | Date | null;
    accepted_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
}

interface WorkspaceMemberWithUserRow extends WorkspaceMemberRow {
    user_name: string | null;
    user_email: string;
}

export class WorkspaceMemberRepository {
    async create(input: CreateWorkspaceMemberInput): Promise<WorkspaceMemberModel> {
        const query = `
            INSERT INTO flowmaestro.workspace_members (
                workspace_id, user_id, role, invited_by, invited_at, accepted_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.workspace_id,
            input.user_id,
            input.role,
            input.invited_by || null,
            input.invited_at || null,
            input.accepted_at || null
        ];

        const result = await db.query<WorkspaceMemberRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<WorkspaceMemberModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_members
            WHERE id = $1
        `;

        const result = await db.query<WorkspaceMemberRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMemberModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_members
            WHERE workspace_id = $1 AND user_id = $2
        `;

        const result = await db.query<WorkspaceMemberRow>(query, [workspaceId, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByWorkspaceId(workspaceId: string): Promise<WorkspaceMemberModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspace_members
            WHERE workspace_id = $1
            ORDER BY created_at ASC
        `;

        const result = await db.query<WorkspaceMemberRow>(query, [workspaceId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByWorkspaceIdWithUsers(workspaceId: string): Promise<WorkspaceMemberWithUser[]> {
        const query = `
            SELECT
                wm.*,
                u.name as user_name,
                u.email as user_email
            FROM flowmaestro.workspace_members wm
            INNER JOIN flowmaestro.users u ON wm.user_id = u.id
            WHERE wm.workspace_id = $1
            ORDER BY
                CASE wm.role
                    WHEN 'owner' THEN 1
                    WHEN 'admin' THEN 2
                    WHEN 'member' THEN 3
                    WHEN 'viewer' THEN 4
                END,
                wm.created_at ASC
        `;

        const result = await db.query<WorkspaceMemberWithUserRow>(query, [workspaceId]);
        return result.rows.map((row) => this.mapRowWithUser(row));
    }

    async findByUserId(userId: string): Promise<WorkspaceMemberModel[]> {
        const query = `
            SELECT * FROM flowmaestro.workspace_members
            WHERE user_id = $1
            ORDER BY created_at ASC
        `;

        const result = await db.query<WorkspaceMemberRow>(query, [userId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async update(
        id: string,
        input: UpdateWorkspaceMemberInput
    ): Promise<WorkspaceMemberModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.role !== undefined) {
            updates.push(`role = $${paramIndex++}`);
            values.push(input.role);
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
            UPDATE flowmaestro.workspace_members
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<WorkspaceMemberRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async updateRole(
        workspaceId: string,
        userId: string,
        role: WorkspaceRole
    ): Promise<WorkspaceMemberModel | null> {
        const query = `
            UPDATE flowmaestro.workspace_members
            SET role = $3, updated_at = CURRENT_TIMESTAMP
            WHERE workspace_id = $1 AND user_id = $2
            RETURNING *
        `;

        const result = await db.query<WorkspaceMemberRow>(query, [workspaceId, userId, role]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workspace_members
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async deleteByWorkspaceAndUser(workspaceId: string, userId: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workspace_members
            WHERE workspace_id = $1 AND user_id = $2
        `;

        const result = await db.query(query, [workspaceId, userId]);
        return (result.rowCount || 0) > 0;
    }

    async getMemberCount(workspaceId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count FROM flowmaestro.workspace_members
            WHERE workspace_id = $1
        `;

        const result = await db.query<{ count: string }>(query, [workspaceId]);
        return parseInt(result.rows[0].count);
    }

    async getOwner(workspaceId: string): Promise<WorkspaceMemberModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workspace_members
            WHERE workspace_id = $1 AND role = 'owner'
            LIMIT 1
        `;

        const result = await db.query<WorkspaceMemberRow>(query, [workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async isUserMember(workspaceId: string, userId: string): Promise<boolean> {
        const query = `
            SELECT 1 FROM flowmaestro.workspace_members
            WHERE workspace_id = $1 AND user_id = $2
        `;

        const result = await db.query(query, [workspaceId, userId]);
        return (result.rowCount || 0) > 0;
    }

    private mapRow(row: WorkspaceMemberRow): WorkspaceMemberModel {
        return {
            id: row.id,
            workspace_id: row.workspace_id,
            user_id: row.user_id,
            role: row.role,
            invited_by: row.invited_by,
            invited_at: row.invited_at ? new Date(row.invited_at) : null,
            accepted_at: row.accepted_at ? new Date(row.accepted_at) : null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at)
        };
    }

    private mapRowWithUser(row: WorkspaceMemberWithUserRow): WorkspaceMemberWithUser {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            userId: row.user_id,
            role: row.role,
            invitedBy: row.invited_by,
            invitedAt: row.invited_at ? new Date(row.invited_at) : null,
            acceptedAt: row.accepted_at ? new Date(row.accepted_at) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            user: {
                id: row.user_id,
                name: row.user_name,
                email: row.user_email
            }
        };
    }

    // Convert model to shared type
    modelToShared(model: WorkspaceMemberModel): WorkspaceMember {
        return {
            id: model.id,
            workspaceId: model.workspace_id,
            userId: model.user_id,
            role: model.role,
            invitedBy: model.invited_by,
            invitedAt: model.invited_at,
            acceptedAt: model.accepted_at,
            createdAt: model.created_at,
            updatedAt: model.updated_at
        };
    }
}
