import type {
    FolderWithCounts,
    FolderItemCounts,
    FolderContents,
    WorkflowSummary,
    AgentSummary,
    FormInterfaceSummary,
    ChatInterfaceSummary,
    KnowledgeBaseSummary
} from "@flowmaestro/shared";
import { db } from "../database";
import { FolderModel, CreateFolderInput, UpdateFolderInput } from "../models/Folder";

interface FolderRow {
    id: string;
    user_id: string;
    name: string;
    color: string;
    position: number;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

interface FolderWithCountsRow extends FolderRow {
    workflow_count: string;
    agent_count: string;
    form_interface_count: string;
    chat_interface_count: string;
    knowledge_base_count: string;
}

export class FolderRepository {
    async create(input: CreateFolderInput): Promise<FolderModel> {
        // Get next position for this user's folders
        const positionResult = await db.query<{ max_position: number | null }>(
            `SELECT MAX(position) as max_position FROM flowmaestro.folders
             WHERE user_id = $1 AND deleted_at IS NULL`,
            [input.user_id]
        );
        const nextPosition = (positionResult.rows[0]?.max_position ?? -1) + 1;

        const query = `
            INSERT INTO flowmaestro.folders (user_id, name, color, position)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [input.user_id, input.name, input.color || "#6366f1", nextPosition];

        const result = await db.query<FolderRow>(query, values);
        return this.mapRow(result.rows[0]);
    }

    async findById(id: string): Promise<FolderModel | null> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query<FolderRow>(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByIdAndUserId(id: string, userId: string): Promise<FolderModel | null> {
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
                 WHERE kb.folder_id = f.id) as knowledge_base_count
            FROM flowmaestro.folders f
            WHERE f.user_id = $1 AND f.deleted_at IS NULL
            ORDER BY f.position ASC, f.created_at ASC
        `;

        const result = await db.query<FolderWithCountsRow>(query, [userId]);
        return result.rows.map((row) => this.mapRowWithCounts(row));
    }

    async getContents(id: string, userId: string): Promise<FolderContents | null> {
        const folder = await this.findByIdAndUserId(id, userId);
        if (!folder) return null;

        // Fetch all items in parallel
        const [workflows, agents, formInterfaces, chatInterfaces, knowledgeBases] =
            await Promise.all([
                this.getWorkflowsInFolder(id),
                this.getAgentsInFolder(id),
                this.getFormInterfacesInFolder(id),
                this.getChatInterfacesInFolder(id),
                this.getKnowledgeBasesInFolder(id)
            ]);

        const itemCounts: FolderItemCounts = {
            workflows: workflows.length,
            agents: agents.length,
            formInterfaces: formInterfaces.length,
            chatInterfaces: chatInterfaces.length,
            knowledgeBases: knowledgeBases.length,
            total:
                workflows.length +
                agents.length +
                formInterfaces.length +
                chatInterfaces.length +
                knowledgeBases.length
        };

        return {
            folder: {
                id: folder.id,
                userId: folder.user_id,
                name: folder.name,
                color: folder.color,
                position: folder.position,
                createdAt: folder.created_at,
                updatedAt: folder.updated_at
            },
            items: {
                workflows,
                agents,
                formInterfaces,
                chatInterfaces,
                knowledgeBases
            },
            itemCounts
        };
    }

    async getItemCounts(id: string): Promise<FolderItemCounts> {
        const query = `
            SELECT
                (SELECT COUNT(*) FROM flowmaestro.workflows w
                 WHERE w.folder_id = $1 AND w.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents a
                 WHERE a.folder_id = $1 AND a.deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces fi
                 WHERE fi.folder_id = $1 AND fi.deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces ci
                 WHERE ci.folder_id = $1 AND ci.deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases kb
                 WHERE kb.folder_id = $1) as knowledge_base_count
        `;

        const result = await db.query<{
            workflow_count: string;
            agent_count: string;
            form_interface_count: string;
            chat_interface_count: string;
            knowledge_base_count: string;
        }>(query, [id]);

        const row = result.rows[0];
        const counts = {
            workflows: parseInt(row.workflow_count),
            agents: parseInt(row.agent_count),
            formInterfaces: parseInt(row.form_interface_count),
            chatInterfaces: parseInt(row.chat_interface_count),
            knowledgeBases: parseInt(row.knowledge_base_count),
            total: 0
        };
        counts.total =
            counts.workflows +
            counts.agents +
            counts.formInterfaces +
            counts.chatInterfaces +
            counts.knowledgeBases;

        return counts;
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

        if (updates.length === 0) {
            return this.findByIdAndUserId(id, userId);
        }

        values.push(id, userId);
        const query = `
            UPDATE flowmaestro.folders
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<FolderRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        // Soft delete the folder - items will have folder_id set to NULL via ON DELETE SET NULL
        // But since we're soft deleting, we need to manually clear folder_id on items
        await this.clearFolderIdFromItems(id);

        const query = `
            UPDATE flowmaestro.folders
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    async isNameAvailable(name: string, userId: string, excludeId?: string): Promise<boolean> {
        const query = excludeId
            ? `SELECT 1 FROM flowmaestro.folders
               WHERE LOWER(name) = LOWER($1) AND user_id = $2 AND id != $3 AND deleted_at IS NULL`
            : `SELECT 1 FROM flowmaestro.folders
               WHERE LOWER(name) = LOWER($1) AND user_id = $2 AND deleted_at IS NULL`;

        const params = excludeId ? [name, userId, excludeId] : [name, userId];
        const result = await db.query(query, params);
        return result.rowCount === 0;
    }

    // Helper methods for getting items in folder
    private async getWorkflowsInFolder(folderId: string): Promise<WorkflowSummary[]> {
        const query = `
            SELECT id, name, description, created_at, updated_at
            FROM flowmaestro.workflows
            WHERE folder_id = $1 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getAgentsInFolder(folderId: string): Promise<AgentSummary[]> {
        const query = `
            SELECT id, name, description, provider, model, created_at, updated_at
            FROM flowmaestro.agents
            WHERE folder_id = $1 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            provider: string;
            model: string;
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            provider: row.provider,
            model: row.model,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getFormInterfacesInFolder(folderId: string): Promise<FormInterfaceSummary[]> {
        const query = `
            SELECT id, name, title, status, created_at, updated_at
            FROM flowmaestro.form_interfaces
            WHERE folder_id = $1 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            title: string;
            status: "draft" | "published";
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            title: row.title,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getChatInterfacesInFolder(folderId: string): Promise<ChatInterfaceSummary[]> {
        const query = `
            SELECT id, name, title, status, created_at, updated_at
            FROM flowmaestro.chat_interfaces
            WHERE folder_id = $1 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            title: string;
            status: "draft" | "published";
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            title: row.title,
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getKnowledgeBasesInFolder(folderId: string): Promise<KnowledgeBaseSummary[]> {
        const query = `
            SELECT kb.id, kb.name, kb.description, kb.created_at, kb.updated_at,
                   COUNT(kd.id) as document_count
            FROM flowmaestro.knowledge_bases kb
            LEFT JOIN flowmaestro.knowledge_documents kd ON kd.knowledge_base_id = kb.id
            WHERE kb.folder_id = $1
            GROUP BY kb.id
            ORDER BY kb.updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            created_at: string;
            updated_at: string;
            document_count: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            documentCount: parseInt(row.document_count),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async clearFolderIdFromItems(folderId: string): Promise<void> {
        // Clear folder_id from all resource tables when folder is deleted
        await Promise.all([
            db.query("UPDATE flowmaestro.workflows SET folder_id = NULL WHERE folder_id = $1", [
                folderId
            ]),
            db.query("UPDATE flowmaestro.agents SET folder_id = NULL WHERE folder_id = $1", [
                folderId
            ]),
            db.query(
                "UPDATE flowmaestro.form_interfaces SET folder_id = NULL WHERE folder_id = $1",
                [folderId]
            ),
            db.query(
                "UPDATE flowmaestro.chat_interfaces SET folder_id = NULL WHERE folder_id = $1",
                [folderId]
            ),
            db.query(
                "UPDATE flowmaestro.knowledge_bases SET folder_id = NULL WHERE folder_id = $1",
                [folderId]
            )
        ]);
    }

    private mapRow(row: FolderRow): FolderModel {
        return {
            id: row.id,
            user_id: row.user_id,
            name: row.name,
            color: row.color,
            position: row.position,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }

    private mapRowWithCounts(row: FolderWithCountsRow): FolderWithCounts {
        const counts = {
            workflows: parseInt(row.workflow_count),
            agents: parseInt(row.agent_count),
            formInterfaces: parseInt(row.form_interface_count),
            chatInterfaces: parseInt(row.chat_interface_count),
            knowledgeBases: parseInt(row.knowledge_base_count),
            total: 0
        };
        counts.total =
            counts.workflows +
            counts.agents +
            counts.formInterfaces +
            counts.chatInterfaces +
            counts.knowledgeBases;

        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            color: row.color,
            position: row.position,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            itemCounts: counts
        };
    }
}
