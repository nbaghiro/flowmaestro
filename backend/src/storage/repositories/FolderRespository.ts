import { db } from "../database";
import { FolderModel, CreateFolderInput, UpdateFolderInput } from "../models/Folder";

interface FolderRow {
    id: string;
    user_id: string;
    name: string;
    color: string;
    position: number | string;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

export interface FolderWithCounts extends FolderModel {
    itemCounts: {
        workflows: number;
        agents: number;
        formInterfaces: number;
        chatInterfaces: number;
        knowledgeBases: number;
        total: number;
    };
}

export interface FolderContents {
    folder: FolderModel;
    items: {
        workflows: unknown[];
        agents: unknown[];
        formInterfaces: unknown[];
        chatInterfaces: unknown[];
        knowledgeBases: unknown[];
    };
}

export class FolderRepository {
    async create(input: CreateFolderInput): Promise<FolderModel> {
        const query = `
            INSERT INTO flowmaestro.folders (user_id, name, color, position)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [input.user_id, input.name, input.color || "#6366f1", input.position || 0];

        const result = await db.query<FolderRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string, userId: string): Promise<FolderModel | null> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<FolderRow>(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByUserId(userId: string): Promise<FolderModel[]> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY position ASC, created_at ASC
        `;

        const result = await db.query<FolderRow>(query, [userId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByUserIdWithCounts(userId: string): Promise<FolderWithCounts[]> {
        const query = `
            SELECT
                f.*,
                (SELECT COUNT(*) FROM flowmaestro.workflows w
                 WHERE w.folder_id = f.id AND w.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents a
                 WHERE a.folder_id = f.id AND a.deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces fi
                 WHERE fi.folder_id = f.id AND fi.deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces ci
                 WHERE ci.folder_id = f.id AND ci.deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases kb
                 WHERE kb.folder_id = f.id AND kb.deleted_at IS NULL) as knowledge_base_count
            FROM flowmaestro.folders f
            WHERE f.user_id = $1 AND f.deleted_at IS NULL
            ORDER BY f.position ASC, f.created_at ASC
        `;

        const result = await db.query(query, [userId]);
        return result.rows.map((row) => {
            const folder = this.mapRow(row as FolderRow);
            const workflowCount = parseInt(row.workflow_count || "0");
            const agentCount = parseInt(row.agent_count || "0");
            const formInterfaceCount = parseInt(row.form_interface_count || "0");
            const chatInterfaceCount = parseInt(row.chat_interface_count || "0");
            const knowledgeBaseCount = parseInt(row.knowledge_base_count || "0");

            return {
                ...folder,
                itemCounts: {
                    workflows: workflowCount,
                    agents: agentCount,
                    formInterfaces: formInterfaceCount,
                    chatInterfaces: chatInterfaceCount,
                    knowledgeBases: knowledgeBaseCount,
                    total:
                        workflowCount +
                        agentCount +
                        formInterfaceCount +
                        chatInterfaceCount +
                        knowledgeBaseCount
                }
            };
        });
    }

    async update(
        id: string,
        userId: string,
        input: UpdateFolderInput
    ): Promise<FolderModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(input.name);
        }

        if (input.color !== undefined) {
            updates.push(`color = $${paramIndex++}`);
            values.push(input.color);
        }

        if (input.position !== undefined) {
            updates.push(`position = $${paramIndex++}`);
            values.push(input.position);
        }

        // Always update updated_at
        updates.push("updated_at = CURRENT_TIMESTAMP");

        if (updates.length === 1) {
            // Only updated_at, no actual changes
            return this.findById(id, userId);
        }

        values.push(id, userId);
        const query = `
            UPDATE flowmaestro.folders
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<FolderRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async softDelete(id: string, userId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.folders
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    async getContents(id: string, userId: string): Promise<FolderContents | null> {
        const folder = await this.findById(id, userId);
        if (!folder) {
            return null;
        }

        // Get all items in folder grouped by type
        const [
            workflowsResult,
            agentsResult,
            formInterfacesResult,
            chatInterfacesResult,
            knowledgeBasesResult
        ] = await Promise.all([
            db.query(
                `SELECT id, name, created_at, updated_at
                     FROM flowmaestro.workflows
                     WHERE folder_id = $1 AND deleted_at IS NULL
                     ORDER BY updated_at DESC`,
                [id]
            ),
            db.query(
                `SELECT id, name, provider, model, created_at, updated_at
                     FROM flowmaestro.agents
                     WHERE folder_id = $1 AND deleted_at IS NULL
                     ORDER BY updated_at DESC`,
                [id]
            ),
            db.query(
                `SELECT id, name, slug, status, created_at, updated_at
                     FROM flowmaestro.form_interfaces
                     WHERE folder_id = $1 AND deleted_at IS NULL
                     ORDER BY updated_at DESC`,
                [id]
            ),
            db.query(
                `SELECT id, name, slug, status, created_at, updated_at
                     FROM flowmaestro.chat_interfaces
                     WHERE folder_id = $1 AND deleted_at IS NULL
                     ORDER BY updated_at DESC`,
                [id]
            ),
            db.query(
                `SELECT id, name, created_at, updated_at
                     FROM flowmaestro.knowledge_bases
                     WHERE folder_id = $1
                     ORDER BY updated_at DESC`,
                [id]
            )
        ]);

        return {
            folder,
            items: {
                workflows: workflowsResult.rows,
                agents: agentsResult.rows,
                formInterfaces: formInterfacesResult.rows,
                chatInterfaces: chatInterfacesResult.rows,
                knowledgeBases: knowledgeBasesResult.rows
            }
        };
    }

    async isNameAvailable(name: string, userId: string, excludeId?: string): Promise<boolean> {
        const query = excludeId
            ? `SELECT COUNT(*) as count
               FROM flowmaestro.folders
               WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3 AND deleted_at IS NULL`
            : `SELECT COUNT(*) as count
               FROM flowmaestro.folders
               WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL`;

        const values = excludeId ? [userId, name, excludeId] : [userId, name];
        const result = await db.query<{ count: string }>(query, values);
        return parseInt(result.rows[0].count) === 0;
    }

    private mapRow(row: FolderRow): FolderModel {
        return {
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            color: row.color,
            position: typeof row.position === "string" ? parseInt(row.position) : row.position,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
