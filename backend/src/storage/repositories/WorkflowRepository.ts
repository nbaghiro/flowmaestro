import type { JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import { db } from "../database";
import {
    WorkflowModel,
    CreateWorkflowInput,
    UpdateWorkflowInput,
    WorkflowType
} from "../models/Workflow";

interface WorkflowRow {
    id: string;
    name: string;
    description: string | null;
    definition: string | Record<string, JsonValue>;
    user_id: string;
    workspace_id: string;
    version: number;
    ai_generated: boolean;
    ai_prompt: string | null;
    workflow_type: WorkflowType;
    system_key: string | null;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

export class WorkflowRepository {
    async create(input: CreateWorkflowInput): Promise<WorkflowModel> {
        const query = `
            INSERT INTO flowmaestro.workflows (name, description, definition, user_id, workspace_id, ai_generated, ai_prompt, workflow_type, system_key)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            input.name,
            input.description || null,
            JSON.stringify(input.definition),
            input.user_id,
            input.workspace_id,
            input.ai_generated || false,
            input.ai_prompt || null,
            input.workflow_type || "user",
            input.system_key || null
        ];

        const result = await db.query<WorkflowRow>(query, values);
        return this.mapRow(result.rows[0] as WorkflowRow);
    }

    async findById(id: string): Promise<WorkflowModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workflows
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<WorkflowRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as WorkflowRow) : null;
    }

    async findByIdAndWorkspaceId(id: string, workspaceId: string): Promise<WorkflowModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workflows
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<WorkflowRow>(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as WorkflowRow) : null;
    }

    async findByWorkspaceId(
        workspaceId: string,
        options: {
            limit?: number;
            offset?: number;
            folderId?: string | null;
            includeSystem?: boolean;
        } = {}
    ): Promise<{ workflows: WorkflowModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Build folder filter using folder_ids array
        // folderId = undefined: return all workflows (no filter)
        // folderId = null: return workflows not in any folder (folder_ids IS NULL OR folder_ids = ARRAY[]::UUID[])
        // folderId = 'uuid': return workflows in that folder ($2 = ANY(folder_ids))
        let folderFilter = "";
        const countParams: unknown[] = [workspaceId];
        const queryParams: unknown[] = [workspaceId];

        if (options.folderId === null) {
            folderFilter = " AND (folder_ids IS NULL OR folder_ids = ARRAY[]::UUID[])";
        } else if (options.folderId !== undefined) {
            folderFilter = " AND $2 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))";
            countParams.push(options.folderId);
            queryParams.push(options.folderId);
        }

        // Filter out system workflows by default (unless includeSystem is true)
        const systemFilter = options.includeSystem
            ? ""
            : " AND (workflow_type = 'user' OR workflow_type IS NULL)";

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.workflows
            WHERE workspace_id = $1 AND deleted_at IS NULL${folderFilter}${systemFilter}
        `;

        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;
        const query = `
            SELECT *
            FROM flowmaestro.workflows
            WHERE workspace_id = $1 AND deleted_at IS NULL${folderFilter}${systemFilter}
            ORDER BY created_at DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        queryParams.push(limit, offset);

        const [countResult, workflowsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query<WorkflowRow>(query, queryParams)
        ]);

        return {
            workflows: workflowsResult.rows.map((row) => this.mapRow(row as WorkflowRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(id: string, input: UpdateWorkflowInput): Promise<WorkflowModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(input.description);
        }

        if (input.definition !== undefined) {
            updates.push(`definition = $${paramIndex++}`);
            values.push(JSON.stringify(input.definition));
        }

        if (input.version !== undefined) {
            updates.push(`version = $${paramIndex++}`);
            values.push(input.version);
        }

        if (input.ai_generated !== undefined) {
            updates.push(`ai_generated = $${paramIndex++}`);
            values.push(input.ai_generated);
        }

        if (input.ai_prompt !== undefined) {
            updates.push(`ai_prompt = $${paramIndex++}`);
            values.push(input.ai_prompt);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.workflows
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<WorkflowRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as WorkflowRow) : null;
    }

    async updateSnapshot(id: string, definition: WorkflowDefinition) {
        const result = await db.query(
            `
            UPDATE flowmaestro.workflows
            SET definition = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [id, JSON.stringify(definition)]
        );

        return this.mapRow(result.rows[0] as WorkflowRow);
    }

    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.workflows
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.workflows
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Find a system workflow by its system_key
     */
    async findBySystemKey(key: string): Promise<WorkflowModel | null> {
        const query = `
            SELECT * FROM flowmaestro.workflows
            WHERE system_key = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<WorkflowRow>(query, [key]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as WorkflowRow) : null;
    }

    /**
     * Upsert a system workflow by its system_key
     * Used for seeding system workflows during deployment
     */
    async upsertBySystemKey(
        input: CreateWorkflowInput & { system_key: string }
    ): Promise<WorkflowModel> {
        const query = `
            INSERT INTO flowmaestro.workflows (
                name, description, definition, user_id, workspace_id,
                ai_generated, ai_prompt, workflow_type, system_key
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (system_key) WHERE system_key IS NOT NULL AND deleted_at IS NULL
            DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                definition = EXCLUDED.definition,
                updated_at = NOW()
            RETURNING *
        `;

        const values = [
            input.name,
            input.description || null,
            JSON.stringify(input.definition),
            input.user_id,
            input.workspace_id,
            input.ai_generated || false,
            input.ai_prompt || null,
            input.workflow_type || "system",
            input.system_key
        ];

        const result = await db.query<WorkflowRow>(query, values);
        return this.mapRow(result.rows[0] as WorkflowRow);
    }

    private mapRow(row: WorkflowRow): WorkflowModel {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            definition:
                typeof row.definition === "string" ? JSON.parse(row.definition) : row.definition,
            user_id: row.user_id,
            workspace_id: row.workspace_id,
            version: row.version,
            ai_generated: row.ai_generated,
            ai_prompt: row.ai_prompt,
            workflow_type: row.workflow_type || "user",
            system_key: row.system_key,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
