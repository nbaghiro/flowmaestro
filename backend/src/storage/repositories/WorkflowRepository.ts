import type { JsonValue, WorkflowDefinition } from "@flowmaestro/shared";
import { db } from "../database";
import { WorkflowModel, CreateWorkflowInput, UpdateWorkflowInput } from "../models/Workflow";
import { FolderRepository } from "./FolderRepository";

interface WorkflowRow {
    id: string;
    name: string;
    description: string | null;
    definition: string | Record<string, JsonValue>;
    user_id: string;
    version: number;
    ai_generated: boolean;
    ai_prompt: string | null;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

export class WorkflowRepository {
    async create(input: CreateWorkflowInput): Promise<WorkflowModel> {
        const query = `
            INSERT INTO flowmaestro.workflows (name, description, definition, user_id, ai_generated, ai_prompt)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.name,
            input.description || null,
            JSON.stringify(input.definition),
            input.user_id,
            input.ai_generated || false,
            input.ai_prompt || null
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

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; folderId?: string | null } = {}
    ): Promise<{ workflows: WorkflowModel[]; total: number }> {
        // Ensure junction tables exist
        const folderRepo = new FolderRepository();
        await folderRepo.ensureJunctionTablesExist();

        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Build folder filter using junction table
        // folderId = undefined: return all workflows (no filter)
        // folderId = null: return workflows not in any folder (not in any junction table entry)
        // folderId = 'uuid': return workflows in that folder (via junction table)
        let folderJoin = "";
        let folderFilter = "";
        const countParams: unknown[] = [userId];
        const queryParams: unknown[] = [userId];

        if (options.folderId === null) {
            // Workflows not in any folder
            folderFilter = ` AND NOT EXISTS (
                SELECT 1 FROM flowmaestro.folder_workflows fw
                WHERE fw.workflow_id = workflows.id
            )`;
        } else if (options.folderId !== undefined) {
            // Workflows in specific folder
            folderJoin =
                " INNER JOIN flowmaestro.folder_workflows fw ON fw.workflow_id = workflows.id AND fw.folder_id = $2";
            countParams.push(options.folderId);
            queryParams.push(options.folderId);
        }

        const countQuery = `
            SELECT COUNT(DISTINCT workflows.id) as count
            FROM flowmaestro.workflows
            ${folderJoin}
            WHERE workflows.user_id = $1 AND workflows.deleted_at IS NULL${folderFilter}
        `;

        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;
        const query = `
            SELECT DISTINCT workflows.*
            FROM flowmaestro.workflows
            ${folderJoin}
            WHERE workflows.user_id = $1 AND workflows.deleted_at IS NULL${folderFilter}
            ORDER BY workflows.created_at DESC
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

    private mapRow(row: WorkflowRow): WorkflowModel {
        return {
            ...row,
            definition:
                typeof row.definition === "string" ? JSON.parse(row.definition) : row.definition,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
