import type {
    Folder,
    FolderWithCounts,
    FolderWithAncestors,
    FolderTreeNode,
    FolderItemCounts,
    FolderContents,
    WorkflowSummary,
    AgentSummary,
    FormInterfaceSummary,
    ChatInterfaceSummary,
    KnowledgeBaseSummary
} from "@flowmaestro/shared";
import { MAX_FOLDER_DEPTH } from "@flowmaestro/shared";
import { db } from "../database";
import { FolderModel, CreateFolderInput, UpdateFolderInput } from "../models/Folder";

interface FolderRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    color: string;
    position: number;
    parent_id: string | null;
    depth: number;
    path: string;
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
        // Validate parent exists and check depth limit if parent_id provided
        if (input.parent_id) {
            const parent = await this.findByIdAndWorkspaceId(input.parent_id, input.workspace_id);
            if (!parent) {
                throw new Error("Parent folder not found");
            }
            if (parent.depth >= MAX_FOLDER_DEPTH - 1) {
                throw new Error(
                    `Maximum folder nesting depth (${MAX_FOLDER_DEPTH} levels) exceeded`
                );
            }
        }

        // Get next position for folders within the same parent in the workspace
        const positionResult = await db.query<{ max_position: number | null }>(
            `SELECT MAX(position) as max_position FROM flowmaestro.folders
             WHERE workspace_id = $1
             AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2, '00000000-0000-0000-0000-000000000000')::UUID
             AND deleted_at IS NULL`,
            [input.workspace_id, input.parent_id || null]
        );
        const nextPosition = (positionResult.rows[0]?.max_position ?? -1) + 1;

        const query = `
            INSERT INTO flowmaestro.folders (user_id, workspace_id, name, color, position, parent_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.workspace_id,
            input.name,
            input.color || "#6366f1",
            nextPosition,
            input.parent_id || null
        ];

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

    async findByIdAndWorkspaceId(id: string, workspaceId: string): Promise<FolderModel | null> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<FolderRow>(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * @deprecated Use findByIdAndWorkspaceId instead. Kept for backward compatibility.
     */
    async findByIdAndUserId(id: string, userId: string): Promise<FolderModel | null> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query<FolderRow>(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async findByWorkspaceId(workspaceId: string): Promise<FolderModel[]> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE workspace_id = $1 AND deleted_at IS NULL
            ORDER BY position ASC, created_at ASC
        `;

        const result = await db.query<FolderRow>(query, [workspaceId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * @deprecated Use findByWorkspaceId instead. Kept for backward compatibility.
     */
    async findByUserId(userId: string): Promise<FolderModel[]> {
        const query = `
            SELECT * FROM flowmaestro.folders
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY position ASC, created_at ASC
        `;

        const result = await db.query<FolderRow>(query, [userId]);
        return result.rows.map((row) => this.mapRow(row));
    }

    async findByWorkspaceIdWithCounts(workspaceId: string): Promise<FolderWithCounts[]> {
        const query = `
            SELECT
                f.*,
                (SELECT COUNT(*) FROM flowmaestro.workflows
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))) as knowledge_base_count
            FROM flowmaestro.folders f
            WHERE f.workspace_id = $1 AND f.deleted_at IS NULL
            ORDER BY f.position ASC, f.created_at ASC
        `;

        const result = await db.query<FolderWithCountsRow>(query, [workspaceId]);
        return result.rows.map((row) => this.mapRowWithCounts(row));
    }

    /**
     * @deprecated Use findByWorkspaceIdWithCounts instead. Kept for backward compatibility.
     */
    async findByUserIdWithCounts(userId: string): Promise<FolderWithCounts[]> {
        const query = `
            SELECT
                f.*,
                (SELECT COUNT(*) FROM flowmaestro.workflows
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))) as knowledge_base_count
            FROM flowmaestro.folders f
            WHERE f.user_id = $1 AND f.deleted_at IS NULL
            ORDER BY f.position ASC, f.created_at ASC
        `;

        const result = await db.query<FolderWithCountsRow>(query, [userId]);
        return result.rows.map((row) => this.mapRowWithCounts(row));
    }

    async getContents(id: string, userId: string): Promise<FolderContents | null> {
        // Get folder with ancestors for breadcrumbs
        const folderWithAncestors = await this.findByIdWithAncestors(id, userId);
        if (!folderWithAncestors) return null;

        // Fetch all items and subfolders in parallel
        const [workflows, agents, formInterfaces, chatInterfaces, knowledgeBases, subfolders] =
            await Promise.all([
                this.getWorkflowsInFolder(id),
                this.getAgentsInFolder(id),
                this.getFormInterfacesInFolder(id),
                this.getChatInterfacesInFolder(id),
                this.getKnowledgeBasesInFolder(id),
                this.getChildren(id, userId)
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
            folder: folderWithAncestors,
            items: {
                workflows,
                agents,
                formInterfaces,
                chatInterfaces,
                knowledgeBases
            },
            itemCounts,
            subfolders
        };
    }

    async getContentsInWorkspace(id: string, workspaceId: string): Promise<FolderContents | null> {
        // Get folder with ancestors for breadcrumbs
        const folderWithAncestors = await this.findByIdWithAncestorsInWorkspace(id, workspaceId);
        if (!folderWithAncestors) return null;

        // Fetch all items and subfolders in parallel
        const [workflows, agents, formInterfaces, chatInterfaces, knowledgeBases, subfolders] =
            await Promise.all([
                this.getWorkflowsInFolder(id),
                this.getAgentsInFolder(id),
                this.getFormInterfacesInFolder(id),
                this.getChatInterfacesInFolder(id),
                this.getKnowledgeBasesInFolder(id),
                this.getChildrenInWorkspace(id, workspaceId)
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
            folder: folderWithAncestors,
            items: {
                workflows,
                agents,
                formInterfaces,
                chatInterfaces,
                knowledgeBases
            },
            itemCounts,
            subfolders
        };
    }

    async getItemCounts(id: string): Promise<FolderItemCounts> {
        const query = `
            SELECT
                (SELECT COUNT(*) FROM flowmaestro.workflows
                 WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents
                 WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces
                 WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces
                 WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases
                 WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))) as knowledge_base_count
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

    async updateInWorkspace(
        id: string,
        workspaceId: string,
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
            return this.findByIdAndWorkspaceId(id, workspaceId);
        }

        values.push(id, workspaceId);
        const query = `
            UPDATE flowmaestro.folders
            SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query<FolderRow>(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    async delete(id: string, userId: string): Promise<boolean> {
        // Get the folder to find its parent
        const folder = await this.findByIdAndUserId(id, userId);
        if (!folder) return false;

        // Promote child folders to the deleted folder's parent
        await db.query(
            `UPDATE flowmaestro.folders
             SET parent_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE parent_id = $2 AND deleted_at IS NULL`,
            [folder.parent_id, id]
        );

        // Clear folder_id from all items when folder is deleted
        await this.clearFolderIdFromItems(id);

        const query = `
            UPDATE flowmaestro.folders
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    async deleteInWorkspace(id: string, workspaceId: string): Promise<boolean> {
        // Get the folder to find its parent
        const folder = await this.findByIdAndWorkspaceId(id, workspaceId);
        if (!folder) return false;

        // Promote child folders to the deleted folder's parent
        await db.query(
            `UPDATE flowmaestro.folders
             SET parent_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE parent_id = $2 AND deleted_at IS NULL`,
            [folder.parent_id, id]
        );

        // Clear folder_id from all items when folder is deleted
        await this.clearFolderIdFromItems(id);

        const query = `
            UPDATE flowmaestro.folders
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return (result.rowCount || 0) > 0;
    }

    async isNameAvailable(
        name: string,
        userId: string,
        parentId: string | null = null,
        excludeId?: string
    ): Promise<boolean> {
        // Check name uniqueness within the same parent folder
        const query = excludeId
            ? `SELECT 1 FROM flowmaestro.folders
               WHERE LOWER(name) = LOWER($1)
               AND user_id = $2
               AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')::UUID
               AND id != $4
               AND deleted_at IS NULL`
            : `SELECT 1 FROM flowmaestro.folders
               WHERE LOWER(name) = LOWER($1)
               AND user_id = $2
               AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')::UUID
               AND deleted_at IS NULL`;

        const params = excludeId ? [name, userId, parentId, excludeId] : [name, userId, parentId];
        const result = await db.query(query, params);
        return result.rowCount === 0;
    }

    async isNameAvailableInWorkspace(
        name: string,
        workspaceId: string,
        parentId: string | null = null,
        excludeId?: string
    ): Promise<boolean> {
        // Check name uniqueness within the same parent folder in the workspace
        const query = excludeId
            ? `SELECT 1 FROM flowmaestro.folders
               WHERE LOWER(name) = LOWER($1)
               AND workspace_id = $2
               AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')::UUID
               AND id != $4
               AND deleted_at IS NULL`
            : `SELECT 1 FROM flowmaestro.folders
               WHERE LOWER(name) = LOWER($1)
               AND workspace_id = $2
               AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($3, '00000000-0000-0000-0000-000000000000')::UUID
               AND deleted_at IS NULL`;

        const params = excludeId
            ? [name, workspaceId, parentId, excludeId]
            : [name, workspaceId, parentId];
        const result = await db.query(query, params);
        return result.rowCount === 0;
    }

    // Helper methods for getting items in folder
    private async getWorkflowsInFolder(folderId: string): Promise<WorkflowSummary[]> {
        const query = `
            SELECT id, name, description, definition, created_at, updated_at
            FROM flowmaestro.workflows
            WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            definition: Record<string, unknown> | null;
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            definition: row.definition,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getAgentsInFolder(folderId: string): Promise<AgentSummary[]> {
        const query = `
            SELECT id, name, description, provider, model, available_tools,
                   LEFT(system_prompt, 200) as system_prompt, temperature,
                   created_at, updated_at
            FROM flowmaestro.agents
            WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            provider: string;
            model: string;
            available_tools: string[] | null;
            system_prompt: string | null;
            temperature: number | null;
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            provider: row.provider,
            model: row.model,
            availableTools: row.available_tools || [],
            systemPrompt: row.system_prompt || undefined,
            temperature: row.temperature ?? undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getFormInterfacesInFolder(folderId: string): Promise<FormInterfaceSummary[]> {
        const query = `
            SELECT id, name, title, description, status,
                   cover_type, cover_value, icon_url, slug,
                   submission_count, created_at, updated_at
            FROM flowmaestro.form_interfaces
            WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            title: string;
            description: string | null;
            status: "draft" | "published";
            cover_type: "color" | "image" | "stock" | null;
            cover_value: string | null;
            icon_url: string | null;
            slug: string | null;
            submission_count: string;
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            title: row.title,
            description: row.description,
            status: row.status,
            coverType: row.cover_type || undefined,
            coverValue: row.cover_value || undefined,
            iconUrl: row.icon_url,
            slug: row.slug || undefined,
            submissionCount: parseInt(row.submission_count || "0"),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getChatInterfacesInFolder(folderId: string): Promise<ChatInterfaceSummary[]> {
        const query = `
            SELECT id, name, title, description, status,
                   cover_type, cover_value, icon_url, slug,
                   session_count, message_count, created_at, updated_at
            FROM flowmaestro.chat_interfaces
            WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            title: string;
            description: string | null;
            status: "draft" | "published";
            cover_type: "color" | "image" | "gradient" | null;
            cover_value: string | null;
            icon_url: string | null;
            slug: string | null;
            session_count: string;
            message_count: string;
            created_at: string;
            updated_at: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            title: row.title,
            description: row.description,
            status: row.status,
            coverType: row.cover_type || undefined,
            coverValue: row.cover_value || undefined,
            iconUrl: row.icon_url,
            slug: row.slug || undefined,
            sessionCount: parseInt(row.session_count || "0"),
            messageCount: parseInt(row.message_count || "0"),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async getKnowledgeBasesInFolder(folderId: string): Promise<KnowledgeBaseSummary[]> {
        const query = `
            SELECT kb.id, kb.name, kb.description, kb.config, kb.created_at, kb.updated_at,
                   COUNT(DISTINCT kd.id) as document_count,
                   COUNT(kc.id) as chunk_count,
                   COALESCE(SUM(kd.file_size), 0) as total_size_bytes
            FROM flowmaestro.knowledge_bases kb
            LEFT JOIN flowmaestro.knowledge_documents kd ON kd.knowledge_base_id = kb.id
            LEFT JOIN flowmaestro.knowledge_chunks kc ON kc.document_id = kd.id
            WHERE $1 = ANY(COALESCE(kb.folder_ids, ARRAY[]::UUID[]))
            GROUP BY kb.id
            ORDER BY kb.updated_at DESC
        `;
        const result = await db.query<{
            id: string;
            name: string;
            description: string | null;
            config: { embeddingModel?: string } | null;
            created_at: string;
            updated_at: string;
            document_count: string;
            chunk_count: string;
            total_size_bytes: string;
        }>(query, [folderId]);

        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            documentCount: parseInt(row.document_count),
            embeddingModel: row.config?.embeddingModel,
            chunkCount: parseInt(row.chunk_count),
            totalSizeBytes: parseInt(row.total_size_bytes),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        }));
    }

    private async clearFolderIdFromItems(folderId: string): Promise<void> {
        // Remove folder_id from folder_ids array when folder is deleted
        await Promise.all([
            db.query(
                "UPDATE flowmaestro.workflows SET folder_ids = array_remove(COALESCE(folder_ids, ARRAY[]::UUID[]), $1::UUID) WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))",
                [folderId]
            ),
            db.query(
                "UPDATE flowmaestro.agents SET folder_ids = array_remove(COALESCE(folder_ids, ARRAY[]::UUID[]), $1::UUID) WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))",
                [folderId]
            ),
            db.query(
                "UPDATE flowmaestro.form_interfaces SET folder_ids = array_remove(COALESCE(folder_ids, ARRAY[]::UUID[]), $1::UUID) WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))",
                [folderId]
            ),
            db.query(
                "UPDATE flowmaestro.chat_interfaces SET folder_ids = array_remove(COALESCE(folder_ids, ARRAY[]::UUID[]), $1::UUID) WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))",
                [folderId]
            ),
            db.query(
                "UPDATE flowmaestro.knowledge_bases SET folder_ids = array_remove(COALESCE(folder_ids, ARRAY[]::UUID[]), $1::UUID) WHERE $1 = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))",
                [folderId]
            )
        ]);
    }

    private mapRow(row: FolderRow): FolderModel {
        return {
            id: row.id,
            user_id: row.user_id,
            workspace_id: row.workspace_id,
            name: row.name,
            color: row.color,
            position: row.position,
            parent_id: row.parent_id,
            depth: row.depth ?? 0,
            path: row.path ?? "",
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
            parentId: row.parent_id,
            depth: row.depth ?? 0,
            path: row.path ?? "",
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            itemCounts: counts
        };
    }

    // Convert FolderModel to shared Folder type
    private mapModelToShared(model: FolderModel): Folder {
        return {
            id: model.id,
            userId: model.user_id,
            name: model.name,
            color: model.color,
            position: model.position,
            parentId: model.parent_id,
            depth: model.depth,
            path: model.path,
            createdAt: model.created_at,
            updatedAt: model.updated_at
        };
    }

    // Get folder with ancestor chain (for breadcrumbs)
    async findByIdWithAncestors(id: string, userId: string): Promise<FolderWithAncestors | null> {
        const folder = await this.findByIdAndUserId(id, userId);
        if (!folder) return null;

        // Get ancestors using recursive CTE
        const ancestorsQuery = `
            WITH RECURSIVE ancestors AS (
                SELECT id, user_id, name, color, position, parent_id, depth, path, created_at, updated_at
                FROM flowmaestro.folders
                WHERE id = $1 AND deleted_at IS NULL
                UNION ALL
                SELECT f.id, f.user_id, f.name, f.color, f.position, f.parent_id, f.depth, f.path, f.created_at, f.updated_at
                FROM flowmaestro.folders f
                INNER JOIN ancestors a ON f.id = a.parent_id
                WHERE f.deleted_at IS NULL
            )
            SELECT * FROM ancestors WHERE id != $1 ORDER BY depth ASC
        `;
        const ancestorsResult = await db.query<FolderRow>(ancestorsQuery, [id]);

        return {
            ...this.mapModelToShared(folder),
            ancestors: ancestorsResult.rows.map((row) => this.mapModelToShared(this.mapRow(row)))
        };
    }

    // Get folder with ancestor chain (for breadcrumbs) in workspace
    async findByIdWithAncestorsInWorkspace(
        id: string,
        workspaceId: string
    ): Promise<FolderWithAncestors | null> {
        const folder = await this.findByIdAndWorkspaceId(id, workspaceId);
        if (!folder) return null;

        // Get ancestors using recursive CTE
        const ancestorsQuery = `
            WITH RECURSIVE ancestors AS (
                SELECT id, user_id, name, color, position, parent_id, depth, path, created_at, updated_at
                FROM flowmaestro.folders
                WHERE id = $1 AND deleted_at IS NULL
                UNION ALL
                SELECT f.id, f.user_id, f.name, f.color, f.position, f.parent_id, f.depth, f.path, f.created_at, f.updated_at
                FROM flowmaestro.folders f
                INNER JOIN ancestors a ON f.id = a.parent_id
                WHERE f.deleted_at IS NULL
            )
            SELECT * FROM ancestors WHERE id != $1 ORDER BY depth ASC
        `;
        const ancestorsResult = await db.query<FolderRow>(ancestorsQuery, [id]);

        return {
            ...this.mapModelToShared(folder),
            ancestors: ancestorsResult.rows.map((row) => this.mapModelToShared(this.mapRow(row)))
        };
    }

    // Get all folders as a tree structure
    async getFolderTree(userId: string): Promise<FolderTreeNode[]> {
        const folders = await this.findByUserIdWithCounts(userId);
        return this.buildTree(folders);
    }

    // Get all folders as a tree structure by workspace
    async getFolderTreeByWorkspace(workspaceId: string): Promise<FolderTreeNode[]> {
        const folders = await this.findByWorkspaceIdWithCounts(workspaceId);
        return this.buildTree(folders);
    }

    // Build tree from flat folder list
    private buildTree(folders: FolderWithCounts[]): FolderTreeNode[] {
        const map = new Map<string, FolderTreeNode>();
        const roots: FolderTreeNode[] = [];

        // Create nodes with empty children arrays
        for (const folder of folders) {
            map.set(folder.id, { ...folder, children: [] });
        }

        // Build tree structure
        for (const folder of folders) {
            const node = map.get(folder.id)!;
            if (folder.parentId) {
                const parent = map.get(folder.parentId);
                if (parent) {
                    parent.children.push(node);
                } else {
                    // Orphan becomes root (parent may have been deleted)
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        }

        // Sort children by position at each level
        const sortChildren = (nodes: FolderTreeNode[]) => {
            nodes.sort((a, b) => a.position - b.position);
            nodes.forEach((n) => sortChildren(n.children));
        };
        sortChildren(roots);

        return roots;
    }

    // Get direct children of a folder
    async getChildren(parentId: string | null, userId: string): Promise<FolderWithCounts[]> {
        const query = `
            SELECT
                f.*,
                (SELECT COUNT(*) FROM flowmaestro.workflows
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))) as knowledge_base_count
            FROM flowmaestro.folders f
            WHERE f.user_id = $1
            AND ${parentId ? "f.parent_id = $2" : "f.parent_id IS NULL"}
            AND f.deleted_at IS NULL
            ORDER BY f.position ASC, f.created_at ASC
        `;
        const params = parentId ? [userId, parentId] : [userId];
        const result = await db.query<FolderWithCountsRow>(query, params);
        return result.rows.map((row) => this.mapRowWithCounts(row));
    }

    // Get direct children of a folder in workspace
    async getChildrenInWorkspace(
        parentId: string | null,
        workspaceId: string
    ): Promise<FolderWithCounts[]> {
        const query = `
            SELECT
                f.*,
                (SELECT COUNT(*) FROM flowmaestro.workflows
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as workflow_count,
                (SELECT COUNT(*) FROM flowmaestro.agents
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as agent_count,
                (SELECT COUNT(*) FROM flowmaestro.form_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as form_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.chat_interfaces
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[])) AND deleted_at IS NULL) as chat_interface_count,
                (SELECT COUNT(*) FROM flowmaestro.knowledge_bases
                 WHERE f.id = ANY(COALESCE(folder_ids, ARRAY[]::UUID[]))) as knowledge_base_count
            FROM flowmaestro.folders f
            WHERE f.workspace_id = $1
            AND ${parentId ? "f.parent_id = $2" : "f.parent_id IS NULL"}
            AND f.deleted_at IS NULL
            ORDER BY f.position ASC, f.created_at ASC
        `;
        const params = parentId ? [workspaceId, parentId] : [workspaceId];
        const result = await db.query<FolderWithCountsRow>(query, params);
        return result.rows.map((row) => this.mapRowWithCounts(row));
    }

    // Get all descendant folder IDs (for cycle detection and cascade operations)
    async getDescendantIds(folderId: string): Promise<string[]> {
        const query = `
            WITH RECURSIVE descendants AS (
                SELECT id FROM flowmaestro.folders
                WHERE parent_id = $1 AND deleted_at IS NULL
                UNION ALL
                SELECT f.id FROM flowmaestro.folders f
                INNER JOIN descendants d ON f.parent_id = d.id
                WHERE f.deleted_at IS NULL
            )
            SELECT id FROM descendants
        `;
        const result = await db.query<{ id: string }>(query, [folderId]);
        return result.rows.map((r) => r.id);
    }

    // Move folder to a new parent
    async moveFolder(
        id: string,
        userId: string,
        newParentId: string | null
    ): Promise<FolderModel | null> {
        // Validate ownership
        const folder = await this.findByIdAndUserId(id, userId);
        if (!folder) return null;

        // If moving to same parent, no-op
        if (folder.parent_id === newParentId) {
            return folder;
        }

        // Validate new parent if provided
        if (newParentId) {
            const newParent = await this.findByIdAndUserId(newParentId, userId);
            if (!newParent) {
                throw new Error("Target folder not found");
            }

            // Check depth constraint (folder + its descendants must fit)
            const descendants = await this.getDescendantIds(id);
            const maxDescendantDepth =
                descendants.length > 0 ? await this.getMaxDescendantDepth(id) : 0;
            const requiredDepth = newParent.depth + 1 + maxDescendantDepth;
            if (requiredDepth >= MAX_FOLDER_DEPTH) {
                throw new Error("Maximum folder nesting depth exceeded");
            }

            // Check for cycle (moving into own descendant)
            if (descendants.includes(newParentId)) {
                throw new Error("Cannot move folder into its own descendant");
            }
        }

        // Get next position in new parent
        const positionResult = await db.query<{ max_position: number | null }>(
            `SELECT MAX(position) as max_position FROM flowmaestro.folders
             WHERE user_id = $1
             AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2, '00000000-0000-0000-0000-000000000000')::UUID
             AND deleted_at IS NULL`,
            [userId, newParentId || null]
        );
        const nextPosition = (positionResult.rows[0]?.max_position ?? -1) + 1;

        // Update folder (triggers will handle path/depth updates)
        const updateQuery = `
            UPDATE flowmaestro.folders
            SET parent_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
            RETURNING *
        `;
        const result = await db.query<FolderRow>(updateQuery, [
            newParentId,
            nextPosition,
            id,
            userId
        ]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    // Move folder to a new parent within workspace
    async moveFolderInWorkspace(
        id: string,
        workspaceId: string,
        newParentId: string | null
    ): Promise<FolderModel | null> {
        // Validate ownership
        const folder = await this.findByIdAndWorkspaceId(id, workspaceId);
        if (!folder) return null;

        // If moving to same parent, no-op
        if (folder.parent_id === newParentId) {
            return folder;
        }

        // Validate new parent if provided
        if (newParentId) {
            const newParent = await this.findByIdAndWorkspaceId(newParentId, workspaceId);
            if (!newParent) {
                throw new Error("Target folder not found");
            }

            // Check depth constraint (folder + its descendants must fit)
            const descendants = await this.getDescendantIds(id);
            const maxDescendantDepth =
                descendants.length > 0 ? await this.getMaxDescendantDepth(id) : 0;
            const requiredDepth = newParent.depth + 1 + maxDescendantDepth;
            if (requiredDepth >= MAX_FOLDER_DEPTH) {
                throw new Error("Maximum folder nesting depth exceeded");
            }

            // Check for cycle (moving into own descendant)
            if (descendants.includes(newParentId)) {
                throw new Error("Cannot move folder into its own descendant");
            }
        }

        // Get next position in new parent
        const positionResult = await db.query<{ max_position: number | null }>(
            `SELECT MAX(position) as max_position FROM flowmaestro.folders
             WHERE workspace_id = $1
             AND COALESCE(parent_id, '00000000-0000-0000-0000-000000000000') = COALESCE($2, '00000000-0000-0000-0000-000000000000')::UUID
             AND deleted_at IS NULL`,
            [workspaceId, newParentId || null]
        );
        const nextPosition = (positionResult.rows[0]?.max_position ?? -1) + 1;

        // Update folder (triggers will handle path/depth updates)
        const updateQuery = `
            UPDATE flowmaestro.folders
            SET parent_id = $1, position = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND workspace_id = $4 AND deleted_at IS NULL
            RETURNING *
        `;
        const result = await db.query<FolderRow>(updateQuery, [
            newParentId,
            nextPosition,
            id,
            workspaceId
        ]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    // Get maximum depth among descendants
    private async getMaxDescendantDepth(folderId: string): Promise<number> {
        const query = `
            WITH RECURSIVE descendants AS (
                SELECT id, depth FROM flowmaestro.folders
                WHERE parent_id = $1 AND deleted_at IS NULL
                UNION ALL
                SELECT f.id, f.depth FROM flowmaestro.folders f
                INNER JOIN descendants d ON f.parent_id = d.id
                WHERE f.deleted_at IS NULL
            )
            SELECT COALESCE(MAX(depth), 0) as max_depth FROM descendants
        `;
        const result = await db.query<{ max_depth: number }>(query, [folderId]);
        const folder = await this.findById(folderId);
        if (!folder) return 0;
        // Return relative depth from this folder
        return (result.rows[0]?.max_depth ?? folder.depth) - folder.depth;
    }
}
