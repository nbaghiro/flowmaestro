import type {
    FormInterface,
    FormInterfaceCoverType,
    FormInterfaceStatus,
    FormInterfaceTargetType,
    CreateFormInterfaceInput,
    UpdateFormInterfaceInput
} from "@flowmaestro/shared";
import { db } from "../database";

// Database row interface
interface FormInterfaceRow {
    id: string;
    user_id: string;
    workspace_id: string;
    name: string;
    slug: string;
    target_type: FormInterfaceTargetType;
    workflow_id: string | null;
    agent_id: string | null;
    trigger_id: string | null;
    cover_type: FormInterfaceCoverType;
    cover_value: string;
    icon_url: string | null;
    title: string;
    description: string | null;
    input_placeholder: string;
    input_label: string;
    file_upload_label: string;
    url_input_label: string;
    allow_file_upload: boolean;
    allow_url_input: boolean;
    max_files: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    output_label: string;
    show_copy_button: boolean;
    show_download_button: boolean;
    allow_output_edit: boolean;
    submit_button_text: string;
    submit_loading_text: string;
    status: FormInterfaceStatus;
    published_at: string | Date | null;
    submission_count: number | string;
    last_submission_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
    // Optional joined fields
    workflow_name?: string;
    agent_name?: string;
}

export class FormInterfaceRepository {
    /**
     * Create a new form interface
     */
    async create(
        userId: string,
        workspaceId: string,
        input: CreateFormInterfaceInput
    ): Promise<FormInterface> {
        const query = `
            INSERT INTO flowmaestro.form_interfaces
                (user_id, workspace_id, name, slug, title, description, target_type, workflow_id, agent_id, cover_type, cover_value)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            userId,
            workspaceId,
            input.name,
            input.slug,
            input.title,
            input.description || null,
            input.targetType,
            input.targetType === "workflow" ? input.workflowId : null,
            input.targetType === "agent" ? input.agentId : null,
            input.coverType || "color",
            input.coverValue || "#6366f1"
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as FormInterfaceRow);
    }

    /**
     * Find form interface by ID and workspace ID
     */
    async findByIdAndWorkspaceId(id: string, workspaceId: string): Promise<FormInterface | null> {
        const query = `
            SELECT fi.*, w.name as workflow_name, a.name as agent_name
            FROM flowmaestro.form_interfaces fi
            LEFT JOIN flowmaestro.workflows w ON fi.workflow_id = w.id
            LEFT JOIN flowmaestro.agents a ON fi.agent_id = a.id
            WHERE fi.id = $1 AND fi.workspace_id = $2 AND fi.deleted_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * @deprecated Use findByIdAndWorkspaceId instead. Kept for backward compatibility.
     */
    async findById(id: string, userId: string): Promise<FormInterface | null> {
        const query = `
            SELECT fi.*, w.name as workflow_name, a.name as agent_name
            FROM flowmaestro.form_interfaces fi
            LEFT JOIN flowmaestro.workflows w ON fi.workflow_id = w.id
            LEFT JOIN flowmaestro.agents a ON fi.agent_id = a.id
            WHERE fi.id = $1 AND fi.user_id = $2 AND fi.deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Find form interface by slug (for public access - no userId required)
     */
    async findBySlug(slug: string): Promise<FormInterface | null> {
        const query = `
            SELECT * FROM flowmaestro.form_interfaces
            WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
        `;

        const result = await db.query(query, [slug]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Find all form interfaces for a workspace
     */
    async findByWorkspaceId(
        workspaceId: string,
        options: { limit?: number; offset?: number; folderId?: string | null } = {}
    ): Promise<{ formInterfaces: FormInterface[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Build folder filter using folder_ids array
        let folderFilter = "";
        const countParams: unknown[] = [workspaceId];
        const queryParams: unknown[] = [workspaceId];

        if (options.folderId === null) {
            folderFilter = " AND (fi.folder_ids IS NULL OR fi.folder_ids = ARRAY[]::UUID[])";
        } else if (options.folderId !== undefined) {
            folderFilter = " AND $2 = ANY(COALESCE(fi.folder_ids, ARRAY[]::UUID[]))";
            countParams.push(options.folderId);
            queryParams.push(options.folderId);
        }

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.form_interfaces fi
            WHERE fi.workspace_id = $1 AND fi.deleted_at IS NULL${folderFilter}
        `;

        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;
        const query = `
            SELECT fi.*, w.name as workflow_name, a.name as agent_name
            FROM flowmaestro.form_interfaces fi
            LEFT JOIN flowmaestro.workflows w ON fi.workflow_id = w.id
            LEFT JOIN flowmaestro.agents a ON fi.agent_id = a.id
            WHERE fi.workspace_id = $1 AND fi.deleted_at IS NULL${folderFilter}
            ORDER BY fi.updated_at DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        queryParams.push(limit, offset);

        const [countResult, formInterfacesResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query(query, queryParams)
        ]);

        return {
            formInterfaces: formInterfacesResult.rows.map((row) =>
                this.mapRow(row as FormInterfaceRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * @deprecated Use findByWorkspaceId instead. Kept for backward compatibility.
     */
    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; folderId?: string | null } = {}
    ): Promise<{ formInterfaces: FormInterface[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Build folder filter using folder_ids array
        let folderFilter = "";
        const countParams: unknown[] = [userId];
        const queryParams: unknown[] = [userId];

        if (options.folderId === null) {
            folderFilter = " AND (fi.folder_ids IS NULL OR fi.folder_ids = ARRAY[]::UUID[])";
        } else if (options.folderId !== undefined) {
            folderFilter = " AND $2 = ANY(COALESCE(fi.folder_ids, ARRAY[]::UUID[]))";
            countParams.push(options.folderId);
            queryParams.push(options.folderId);
        }

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.form_interfaces fi
            WHERE fi.user_id = $1 AND fi.deleted_at IS NULL${folderFilter}
        `;

        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;
        const query = `
            SELECT fi.*, w.name as workflow_name, a.name as agent_name
            FROM flowmaestro.form_interfaces fi
            LEFT JOIN flowmaestro.workflows w ON fi.workflow_id = w.id
            LEFT JOIN flowmaestro.agents a ON fi.agent_id = a.id
            WHERE fi.user_id = $1 AND fi.deleted_at IS NULL${folderFilter}
            ORDER BY fi.updated_at DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        queryParams.push(limit, offset);

        const [countResult, formInterfacesResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query(query, queryParams)
        ]);

        return {
            formInterfaces: formInterfacesResult.rows.map((row) =>
                this.mapRow(row as FormInterfaceRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find form interfaces linked to a workflow by workspace
     */
    async findByWorkflowIdAndWorkspaceId(
        workflowId: string,
        workspaceId: string
    ): Promise<FormInterface[]> {
        const query = `
            SELECT * FROM flowmaestro.form_interfaces
            WHERE workflow_id = $1 AND workspace_id = $2 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;

        const result = await db.query(query, [workflowId, workspaceId]);
        return result.rows.map((row) => this.mapRow(row as FormInterfaceRow));
    }

    /**
     * @deprecated Use findByWorkflowIdAndWorkspaceId instead. Kept for backward compatibility.
     */
    async findByWorkflowId(workflowId: string, userId: string): Promise<FormInterface[]> {
        const query = `
            SELECT * FROM flowmaestro.form_interfaces
            WHERE workflow_id = $1 AND user_id = $2 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;

        const result = await db.query(query, [workflowId, userId]);
        return result.rows.map((row) => this.mapRow(row as FormInterfaceRow));
    }

    /**
     * Find form interfaces linked to an agent by workspace
     */
    async findByAgentIdAndWorkspaceId(
        agentId: string,
        workspaceId: string
    ): Promise<FormInterface[]> {
        const query = `
            SELECT * FROM flowmaestro.form_interfaces
            WHERE agent_id = $1 AND workspace_id = $2 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;

        const result = await db.query(query, [agentId, workspaceId]);
        return result.rows.map((row) => this.mapRow(row as FormInterfaceRow));
    }

    /**
     * @deprecated Use findByAgentIdAndWorkspaceId instead. Kept for backward compatibility.
     */
    async findByAgentId(agentId: string, userId: string): Promise<FormInterface[]> {
        const query = `
            SELECT * FROM flowmaestro.form_interfaces
            WHERE agent_id = $1 AND user_id = $2 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;

        const result = await db.query(query, [agentId, userId]);
        return result.rows.map((row) => this.mapRow(row as FormInterfaceRow));
    }

    /**
     * Update a form interface by workspace
     */
    async updateByWorkspaceId(
        id: string,
        workspaceId: string,
        input: UpdateFormInterfaceInput
    ): Promise<FormInterface | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // Build dynamic update query
        const fieldMappings: Array<{ key: keyof UpdateFormInterfaceInput; column: string }> = [
            { key: "name", column: "name" },
            { key: "slug", column: "slug" },
            { key: "title", column: "title" },
            { key: "description", column: "description" },
            { key: "coverType", column: "cover_type" },
            { key: "coverValue", column: "cover_value" },
            { key: "iconUrl", column: "icon_url" },
            { key: "inputPlaceholder", column: "input_placeholder" },
            { key: "inputLabel", column: "input_label" },
            { key: "fileUploadLabel", column: "file_upload_label" },
            { key: "urlInputLabel", column: "url_input_label" },
            { key: "allowFileUpload", column: "allow_file_upload" },
            { key: "allowUrlInput", column: "allow_url_input" },
            { key: "maxFiles", column: "max_files" },
            { key: "maxFileSizeMb", column: "max_file_size_mb" },
            { key: "allowedFileTypes", column: "allowed_file_types" },
            { key: "outputLabel", column: "output_label" },
            { key: "showCopyButton", column: "show_copy_button" },
            { key: "showDownloadButton", column: "show_download_button" },
            { key: "allowOutputEdit", column: "allow_output_edit" },
            { key: "submitButtonText", column: "submit_button_text" },
            { key: "submitLoadingText", column: "submit_loading_text" }
        ];

        for (const { key, column } of fieldMappings) {
            if (input[key] !== undefined) {
                updates.push(`${column} = $${paramIndex++}`);
                values.push(input[key]);
            }
        }

        // Handle target type change
        if (input.targetType !== undefined) {
            updates.push(`target_type = $${paramIndex++}`);
            values.push(input.targetType);

            if (input.targetType === "workflow") {
                updates.push(`workflow_id = $${paramIndex++}`);
                values.push(input.workflowId || null);
                updates.push(`agent_id = $${paramIndex++}`);
                values.push(null);
            } else {
                updates.push(`agent_id = $${paramIndex++}`);
                values.push(input.agentId || null);
                updates.push(`workflow_id = $${paramIndex++}`);
                values.push(null);
            }
        } else {
            // Update individual target IDs if provided without changing type
            if (input.workflowId !== undefined) {
                updates.push(`workflow_id = $${paramIndex++}`);
                values.push(input.workflowId);
            }
            if (input.agentId !== undefined) {
                updates.push(`agent_id = $${paramIndex++}`);
                values.push(input.agentId);
            }
        }

        if (updates.length === 0) {
            return this.findByIdAndWorkspaceId(id, workspaceId);
        }

        values.push(id, workspaceId);
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND workspace_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * @deprecated Use updateByWorkspaceId instead. Kept for backward compatibility.
     */
    async update(
        id: string,
        userId: string,
        input: UpdateFormInterfaceInput
    ): Promise<FormInterface | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // Build dynamic update query
        const fieldMappings: Array<{ key: keyof UpdateFormInterfaceInput; column: string }> = [
            { key: "name", column: "name" },
            { key: "slug", column: "slug" },
            { key: "title", column: "title" },
            { key: "description", column: "description" },
            { key: "coverType", column: "cover_type" },
            { key: "coverValue", column: "cover_value" },
            { key: "iconUrl", column: "icon_url" },
            { key: "inputPlaceholder", column: "input_placeholder" },
            { key: "inputLabel", column: "input_label" },
            { key: "fileUploadLabel", column: "file_upload_label" },
            { key: "urlInputLabel", column: "url_input_label" },
            { key: "allowFileUpload", column: "allow_file_upload" },
            { key: "allowUrlInput", column: "allow_url_input" },
            { key: "maxFiles", column: "max_files" },
            { key: "maxFileSizeMb", column: "max_file_size_mb" },
            { key: "allowedFileTypes", column: "allowed_file_types" },
            { key: "outputLabel", column: "output_label" },
            { key: "showCopyButton", column: "show_copy_button" },
            { key: "showDownloadButton", column: "show_download_button" },
            { key: "allowOutputEdit", column: "allow_output_edit" },
            { key: "submitButtonText", column: "submit_button_text" },
            { key: "submitLoadingText", column: "submit_loading_text" }
        ];

        for (const { key, column } of fieldMappings) {
            if (input[key] !== undefined) {
                updates.push(`${column} = $${paramIndex++}`);
                values.push(input[key]);
            }
        }

        // Handle target type change
        if (input.targetType !== undefined) {
            updates.push(`target_type = $${paramIndex++}`);
            values.push(input.targetType);

            if (input.targetType === "workflow") {
                updates.push(`workflow_id = $${paramIndex++}`);
                values.push(input.workflowId || null);
                updates.push(`agent_id = $${paramIndex++}`);
                values.push(null);
            } else {
                updates.push(`agent_id = $${paramIndex++}`);
                values.push(input.agentId || null);
                updates.push(`workflow_id = $${paramIndex++}`);
                values.push(null);
            }
        } else {
            // Update individual target IDs if provided without changing type
            if (input.workflowId !== undefined) {
                updates.push(`workflow_id = $${paramIndex++}`);
                values.push(input.workflowId);
            }
            if (input.agentId !== undefined) {
                updates.push(`agent_id = $${paramIndex++}`);
                values.push(input.agentId);
            }
        }

        if (updates.length === 0) {
            return this.findById(id, userId);
        }

        values.push(id, userId);
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Publish a form interface by workspace
     */
    async publishByWorkspaceId(id: string, workspaceId: string): Promise<FormInterface | null> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET status = 'published', published_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * @deprecated Use publishByWorkspaceId instead. Kept for backward compatibility.
     */
    async publish(id: string, userId: string): Promise<FormInterface | null> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET status = 'published', published_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Unpublish a form interface by workspace
     */
    async unpublishByWorkspaceId(id: string, workspaceId: string): Promise<FormInterface | null> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET status = 'draft', published_at = NULL
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * @deprecated Use unpublishByWorkspaceId instead. Kept for backward compatibility.
     */
    async unpublish(id: string, userId: string): Promise<FormInterface | null> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET status = 'draft', published_at = NULL
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Soft delete a form interface by workspace
     */
    async softDeleteByWorkspaceId(id: string, workspaceId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * @deprecated Use softDeleteByWorkspaceId instead. Kept for backward compatibility.
     */
    async softDelete(id: string, userId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Check if a slug is available for a workspace
     */
    async isSlugAvailableInWorkspace(
        slug: string,
        workspaceId: string,
        excludeId?: string
    ): Promise<boolean> {
        let query = `
            SELECT 1 FROM flowmaestro.form_interfaces
            WHERE slug = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;
        const values: unknown[] = [slug, workspaceId];

        if (excludeId) {
            query += " AND id != $3";
            values.push(excludeId);
        }

        const result = await db.query(query, values);
        return result.rowCount === 0;
    }

    /**
     * @deprecated Use isSlugAvailableInWorkspace instead. Kept for backward compatibility.
     */
    async isSlugAvailable(slug: string, userId: string, excludeId?: string): Promise<boolean> {
        let query = `
            SELECT 1 FROM flowmaestro.form_interfaces
            WHERE slug = $1 AND user_id = $2 AND deleted_at IS NULL
        `;
        const values: unknown[] = [slug, userId];

        if (excludeId) {
            query += " AND id != $3";
            values.push(excludeId);
        }

        const result = await db.query(query, values);
        return result.rowCount === 0;
    }

    /**
     * Duplicate a form interface by workspace
     */
    async duplicateByWorkspaceId(id: string, workspaceId: string): Promise<FormInterface | null> {
        // First, get the existing form interface
        const existing = await this.findByIdAndWorkspaceId(id, workspaceId);
        if (!existing) {
            return null;
        }

        // Generate a unique slug
        let newSlug = `${existing.slug}-copy`;
        let slugSuffix = 1;
        while (!(await this.isSlugAvailableInWorkspace(newSlug, workspaceId))) {
            newSlug = `${existing.slug}-copy-${slugSuffix}`;
            slugSuffix++;
        }

        const query = `
            INSERT INTO flowmaestro.form_interfaces (
                user_id, workspace_id, name, slug, title, description,
                target_type, workflow_id, agent_id,
                cover_type, cover_value, icon_url,
                input_placeholder, input_label, file_upload_label, url_input_label,
                allow_file_upload, allow_url_input,
                max_files, max_file_size_mb, allowed_file_types,
                output_label, show_copy_button, show_download_button, allow_output_edit,
                submit_button_text, submit_loading_text,
                status
            )
            SELECT
                user_id, workspace_id, $1, $2, title, description,
                target_type, workflow_id, agent_id,
                cover_type, cover_value, icon_url,
                input_placeholder, input_label, file_upload_label, url_input_label,
                allow_file_upload, allow_url_input,
                max_files, max_file_size_mb, allowed_file_types,
                output_label, show_copy_button, show_download_button, allow_output_edit,
                submit_button_text, submit_loading_text,
                'draft'
            FROM flowmaestro.form_interfaces
            WHERE id = $3 AND workspace_id = $4 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [`${existing.name} (Copy)`, newSlug, id, workspaceId]);

        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * @deprecated Use duplicateByWorkspaceId instead. Kept for backward compatibility.
     */
    async duplicate(id: string, userId: string): Promise<FormInterface | null> {
        // First, get the existing form interface
        const existing = await this.findById(id, userId);
        if (!existing) {
            return null;
        }

        // Generate a unique slug
        let newSlug = `${existing.slug}-copy`;
        let slugSuffix = 1;
        while (!(await this.isSlugAvailable(newSlug, userId))) {
            newSlug = `${existing.slug}-copy-${slugSuffix}`;
            slugSuffix++;
        }

        const query = `
            INSERT INTO flowmaestro.form_interfaces (
                user_id, name, slug, title, description,
                target_type, workflow_id, agent_id,
                cover_type, cover_value, icon_url,
                input_placeholder, input_label, file_upload_label, url_input_label,
                allow_file_upload, allow_url_input,
                max_files, max_file_size_mb, allowed_file_types,
                output_label, show_copy_button, show_download_button, allow_output_edit,
                submit_button_text, submit_loading_text,
                status
            )
            SELECT
                user_id, $1, $2, title, description,
                target_type, workflow_id, agent_id,
                cover_type, cover_value, icon_url,
                input_placeholder, input_label, file_upload_label, url_input_label,
                allow_file_upload, allow_url_input,
                max_files, max_file_size_mb, allowed_file_types,
                output_label, show_copy_button, show_download_button, allow_output_edit,
                submit_button_text, submit_loading_text,
                'draft'
            FROM flowmaestro.form_interfaces
            WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [`${existing.name} (Copy)`, newSlug, id, userId]);

        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Set trigger ID for a form interface (used when auto-creating triggers on publish)
     */
    async setTriggerId(id: string, triggerId: string | null): Promise<FormInterface | null> {
        const query = `
            UPDATE flowmaestro.form_interfaces
            SET trigger_id = $2
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, triggerId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as FormInterfaceRow) : null;
    }

    /**
     * Map database row to FormInterface model
     */
    private mapRow(row: FormInterfaceRow): FormInterface {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            slug: row.slug,
            targetType: row.target_type,
            workflowId: row.workflow_id,
            agentId: row.agent_id,
            triggerId: row.trigger_id,
            coverType: row.cover_type,
            coverValue: row.cover_value,
            iconUrl: row.icon_url,
            title: row.title,
            description: row.description,
            inputPlaceholder: row.input_placeholder,
            inputLabel: row.input_label,
            fileUploadLabel: row.file_upload_label,
            urlInputLabel: row.url_input_label,
            allowFileUpload: row.allow_file_upload,
            allowUrlInput: row.allow_url_input,
            maxFiles: row.max_files,
            maxFileSizeMb: row.max_file_size_mb,
            allowedFileTypes: row.allowed_file_types,
            outputLabel: row.output_label,
            showCopyButton: row.show_copy_button,
            showDownloadButton: row.show_download_button,
            allowOutputEdit: row.allow_output_edit,
            submitButtonText: row.submit_button_text,
            submitLoadingText: row.submit_loading_text,
            status: row.status,
            publishedAt: row.published_at ? new Date(row.published_at) : null,
            submissionCount:
                typeof row.submission_count === "string"
                    ? parseInt(row.submission_count)
                    : row.submission_count || 0,
            lastSubmissionAt: row.last_submission_at ? new Date(row.last_submission_at) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}
