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
import { createServiceLogger } from "../../core/logging";
import { db } from "../database";
import { FolderModel, CreateFolderInput, UpdateFolderInput } from "../models/Folder";

const logger = createServiceLogger("FolderRepository");

// Map resource types to junction table names and column names
const JUNCTION_TABLE_CONFIG: Record<
    string,
    { tableName: string; itemIdColumn: string; resourceTable: string }
> = {
    workflow: {
        tableName: "folder_workflows",
        itemIdColumn: "workflow_id",
        resourceTable: "workflows"
    },
    agent: {
        tableName: "folder_agents",
        itemIdColumn: "agent_id",
        resourceTable: "agents"
    },
    "form-interface": {
        tableName: "folder_form_interfaces",
        itemIdColumn: "form_interface_id",
        resourceTable: "form_interfaces"
    },
    "chat-interface": {
        tableName: "folder_chat_interfaces",
        itemIdColumn: "chat_interface_id",
        resourceTable: "chat_interfaces"
    },
    "knowledge-base": {
        tableName: "folder_knowledge_bases",
        itemIdColumn: "knowledge_base_id",
        resourceTable: "knowledge_bases"
    }
};

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
        // Ensure junction tables exist
        await this.ensureJunctionTablesExist();

        const query = `
            SELECT
                f.*,
                (SELECT COUNT(*) FROM flowmaestro.folder_workflows fw
                 INNER JOIN flowmaestro.workflows w ON w.id = fw.workflow_id
                 WHERE fw.folder_id = f.id AND w.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_agents fa
                 INNER JOIN flowmaestro.agents a ON a.id = fa.agent_id
                 WHERE fa.folder_id = f.id AND a.deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_form_interfaces ffi
                 INNER JOIN flowmaestro.form_interfaces fi ON fi.id = ffi.form_interface_id
                 WHERE ffi.folder_id = f.id AND fi.deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_chat_interfaces fci
                 INNER JOIN flowmaestro.chat_interfaces ci ON ci.id = fci.chat_interface_id
                 WHERE fci.folder_id = f.id AND ci.deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_knowledge_bases fkb
                 WHERE fkb.folder_id = f.id) as knowledge_base_count
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
        // Ensure junction tables exist
        await this.ensureJunctionTablesExist();

        const query = `
            SELECT
                (SELECT COUNT(*) FROM flowmaestro.folder_workflows fw
                 INNER JOIN flowmaestro.workflows w ON w.id = fw.workflow_id
                 WHERE fw.folder_id = $1 AND w.deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_agents fa
                 INNER JOIN flowmaestro.agents a ON a.id = fa.agent_id
                 WHERE fa.folder_id = $1 AND a.deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_form_interfaces ffi
                 INNER JOIN flowmaestro.form_interfaces fi ON fi.id = ffi.form_interface_id
                 WHERE ffi.folder_id = $1 AND fi.deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_chat_interfaces fci
                 INNER JOIN flowmaestro.chat_interfaces ci ON ci.id = fci.chat_interface_id
                 WHERE fci.folder_id = $1 AND ci.deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.folder_knowledge_bases fkb
                 WHERE fkb.folder_id = $1) as knowledge_base_count
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
        // Ensure junction tables exist
        await this.ensureJunctionTablesExist();

        // Soft delete the folder - junction table entries will be deleted via ON DELETE CASCADE
        // when the folder is hard deleted, but for soft delete we need to clear junction entries
        // Also clear folder_id column for backward compatibility
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
        await this.ensureJunctionTablesExist();
        const query = `
            SELECT w.id, w.name, w.description, w.created_at, w.updated_at
            FROM flowmaestro.workflows w
            INNER JOIN flowmaestro.folder_workflows fw ON fw.workflow_id = w.id
            WHERE fw.folder_id = $1 AND w.deleted_at IS NULL
            ORDER BY w.updated_at DESC
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
        await this.ensureJunctionTablesExist();
        const query = `
            SELECT a.id, a.name, a.description, a.provider, a.model, a.created_at, a.updated_at
            FROM flowmaestro.agents a
            INNER JOIN flowmaestro.folder_agents fa ON fa.agent_id = a.id
            WHERE fa.folder_id = $1 AND a.deleted_at IS NULL
            ORDER BY a.updated_at DESC
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
        await this.ensureJunctionTablesExist();
        const query = `
            SELECT fi.id, fi.name, fi.title, fi.status, fi.created_at, fi.updated_at
            FROM flowmaestro.form_interfaces fi
            INNER JOIN flowmaestro.folder_form_interfaces ffi ON ffi.form_interface_id = fi.id
            WHERE ffi.folder_id = $1 AND fi.deleted_at IS NULL
            ORDER BY fi.updated_at DESC
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
        await this.ensureJunctionTablesExist();
        const query = `
            SELECT ci.id, ci.name, ci.title, ci.status, ci.created_at, ci.updated_at
            FROM flowmaestro.chat_interfaces ci
            INNER JOIN flowmaestro.folder_chat_interfaces fci ON fci.chat_interface_id = ci.id
            WHERE fci.folder_id = $1 AND ci.deleted_at IS NULL
            ORDER BY ci.updated_at DESC
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
        await this.ensureJunctionTablesExist();
        const query = `
            SELECT kb.id, kb.name, kb.description, kb.created_at, kb.updated_at,
                   COUNT(kd.id) as document_count
            FROM flowmaestro.knowledge_bases kb
            INNER JOIN flowmaestro.folder_knowledge_bases fkb ON fkb.knowledge_base_id = kb.id
            LEFT JOIN flowmaestro.knowledge_documents kd ON kd.knowledge_base_id = kb.id
            WHERE fkb.folder_id = $1
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

    /**
     * Ensure junction tables exist for folder-item relationships
     * Creates them if they don't exist (idempotent)
     */
    async ensureJunctionTablesExist(): Promise<void> {
        try {
            // Check if tables exist, create if not
            for (const [itemType, config] of Object.entries(JUNCTION_TABLE_CONFIG)) {
                const checkQuery = `
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'flowmaestro'
                        AND table_name = $1
                    );
                `;
                const existsResult = await db.query<{ exists: boolean }>(checkQuery, [
                    config.tableName
                ]);

                if (!existsResult.rows[0]?.exists) {
                    logger.info({ tableName: config.tableName }, "Creating junction table");

                    // Create the junction table
                    const createQuery = `
                        CREATE TABLE IF NOT EXISTS flowmaestro.${config.tableName} (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            folder_id UUID NOT NULL REFERENCES flowmaestro.folders(id) ON DELETE CASCADE,
                            ${config.itemIdColumn} UUID NOT NULL REFERENCES flowmaestro.${config.resourceTable}(id) ON DELETE CASCADE,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            CONSTRAINT unique_folder_${itemType.replace("-", "_")} UNIQUE (folder_id, ${config.itemIdColumn})
                        );

                        CREATE INDEX IF NOT EXISTS idx_${config.tableName}_folder ON flowmaestro.${config.tableName}(folder_id);
                        CREATE INDEX IF NOT EXISTS idx_${config.tableName}_item ON flowmaestro.${config.tableName}(${config.itemIdColumn});
                    `;

                    await db.query(createQuery);

                    // Migrate existing data from folder_id column
                    const migrateQuery = `
                        INSERT INTO flowmaestro.${config.tableName} (folder_id, ${config.itemIdColumn})
                        SELECT folder_id, id
                        FROM flowmaestro.${config.resourceTable}
                        WHERE folder_id IS NOT NULL
                        ${config.resourceTable !== "knowledge_bases" ? "AND deleted_at IS NULL" : ""}
                        ON CONFLICT DO NOTHING;
                    `;

                    await db.query(migrateQuery);
                    logger.info(
                        { tableName: config.tableName },
                        "Junction table created and migrated"
                    );
                }
            }
        } catch (error) {
            logger.error({ error }, "Error ensuring junction tables exist");
            throw error;
        }
    }

    /**
     * Get junction table configuration for a resource type
     */
    getJunctionTableConfig(itemType: string) {
        return JUNCTION_TABLE_CONFIG[itemType];
    }

    private async clearFolderIdFromItems(folderId: string): Promise<void> {
        // Delete from junction tables (ON DELETE CASCADE will handle this automatically when folder is hard deleted,
        // but for soft delete we need to manually clear junction entries)
        await Promise.all([
            db.query("DELETE FROM flowmaestro.folder_workflows WHERE folder_id = $1", [folderId]),
            db.query("DELETE FROM flowmaestro.folder_agents WHERE folder_id = $1", [folderId]),
            db.query("DELETE FROM flowmaestro.folder_form_interfaces WHERE folder_id = $1", [
                folderId
            ]),
            db.query("DELETE FROM flowmaestro.folder_chat_interfaces WHERE folder_id = $1", [
                folderId
            ]),
            db.query("DELETE FROM flowmaestro.folder_knowledge_bases WHERE folder_id = $1", [
                folderId
            ])
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
