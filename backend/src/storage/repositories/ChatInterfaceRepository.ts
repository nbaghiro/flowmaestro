import type {
    ChatInterface,
    ChatInterfaceCoverType,
    ChatInterfaceStatus,
    ChatInterfaceWidgetPosition,
    ChatInterfacePersistenceType,
    ChatInterfaceSuggestedPrompt,
    CreateChatInterfaceInput,
    UpdateChatInterfaceInput,
    PublicChatInterface
} from "@flowmaestro/shared";
import { db } from "../database";

// Database row interface
interface ChatInterfaceRow {
    id: string;
    user_id: string;
    name: string;
    slug: string;
    agent_id: string;
    cover_type: ChatInterfaceCoverType;
    cover_value: string;
    icon_url: string | null;
    title: string;
    description: string | null;
    primary_color: string;
    font_family: string;
    border_radius: number;
    welcome_message: string;
    placeholder_text: string;
    suggested_prompts: ChatInterfaceSuggestedPrompt[];
    allow_file_upload: boolean;
    max_files: number;
    max_file_size_mb: number;
    allowed_file_types: string[];
    persistence_type: ChatInterfacePersistenceType;
    session_timeout_minutes: number;
    widget_position: ChatInterfaceWidgetPosition;
    widget_button_icon: string;
    widget_button_text: string | null;
    widget_initial_state: "collapsed" | "expanded";
    rate_limit_messages: number;
    rate_limit_window_seconds: number;
    status: ChatInterfaceStatus;
    published_at: string | Date | null;
    session_count: number | string;
    message_count: number | string;
    last_activity_at: string | Date | null;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
    // Optional joined fields
    agent_name?: string;
}

export class ChatInterfaceRepository {
    /**
     * Create a new chat interface
     */
    async create(userId: string, input: CreateChatInterfaceInput): Promise<ChatInterface> {
        const query = `
            INSERT INTO flowmaestro.chat_interfaces
                (user_id, name, slug, agent_id, title, description,
                 cover_type, cover_value, primary_color, welcome_message, suggested_prompts)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            userId,
            input.name,
            input.slug,
            input.agentId,
            input.title,
            input.description || null,
            input.coverType || "color",
            input.coverValue || "#6366f1",
            input.primaryColor || "#6366f1",
            input.welcomeMessage || "Hello! How can I help you today?",
            JSON.stringify(input.suggestedPrompts || [])
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as ChatInterfaceRow);
    }

    /**
     * Find chat interface by ID (requires userId for ownership check)
     */
    async findById(id: string, userId: string): Promise<ChatInterface | null> {
        const query = `
            SELECT ci.*, a.name as agent_name
            FROM flowmaestro.chat_interfaces ci
            LEFT JOIN flowmaestro.agents a ON ci.agent_id = a.id
            WHERE ci.id = $1 AND ci.user_id = $2 AND ci.deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ChatInterfaceRow) : null;
    }

    /**
     * Find chat interface by slug (for public access - no userId required)
     */
    async findBySlug(slug: string): Promise<ChatInterface | null> {
        const query = `
            SELECT * FROM flowmaestro.chat_interfaces
            WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
        `;

        const result = await db.query(query, [slug]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ChatInterfaceRow) : null;
    }

    /**
     * Find chat interface by slug and return public interface
     */
    async findBySlugPublic(slug: string): Promise<PublicChatInterface | null> {
        const query = `
            SELECT * FROM flowmaestro.chat_interfaces
            WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
        `;

        const result = await db.query(query, [slug]);
        return result.rows.length > 0
            ? this.mapToPublicInterface(result.rows[0] as ChatInterfaceRow)
            : null;
    }

    /**
     * Find all chat interfaces for a user
     */
    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number; folderId?: string | null } = {}
    ): Promise<{ chatInterfaces: ChatInterface[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        // Build folder filter using folder_ids array
        let folderFilter = "";
        const countParams: unknown[] = [userId];
        const queryParams: unknown[] = [userId];

        if (options.folderId === null) {
            folderFilter = " AND (ci.folder_ids IS NULL OR ci.folder_ids = ARRAY[]::UUID[])";
        } else if (options.folderId !== undefined) {
            folderFilter = " AND $2 = ANY(COALESCE(ci.folder_ids, ARRAY[]::UUID[]))";
            countParams.push(options.folderId);
            queryParams.push(options.folderId);
        }

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.chat_interfaces ci
            WHERE ci.user_id = $1 AND ci.deleted_at IS NULL${folderFilter}
        `;

        const limitParamIndex = queryParams.length + 1;
        const offsetParamIndex = queryParams.length + 2;
        const query = `
            SELECT ci.*, a.name as agent_name
            FROM flowmaestro.chat_interfaces ci
            LEFT JOIN flowmaestro.agents a ON ci.agent_id = a.id
            WHERE ci.user_id = $1 AND ci.deleted_at IS NULL${folderFilter}
            ORDER BY ci.updated_at DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        queryParams.push(limit, offset);

        const [countResult, chatInterfacesResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query(query, queryParams)
        ]);

        return {
            chatInterfaces: chatInterfacesResult.rows.map((row) =>
                this.mapRow(row as ChatInterfaceRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Find chat interfaces linked to an agent
     */
    async findByAgentId(agentId: string, userId: string): Promise<ChatInterface[]> {
        const query = `
            SELECT * FROM flowmaestro.chat_interfaces
            WHERE agent_id = $1 AND user_id = $2 AND deleted_at IS NULL
            ORDER BY updated_at DESC
        `;

        const result = await db.query(query, [agentId, userId]);
        return result.rows.map((row) => this.mapRow(row as ChatInterfaceRow));
    }

    /**
     * Update a chat interface
     */
    async update(
        id: string,
        userId: string,
        input: UpdateChatInterfaceInput
    ): Promise<ChatInterface | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        // Build dynamic update query
        const fieldMappings: Array<{ key: keyof UpdateChatInterfaceInput; column: string }> = [
            { key: "name", column: "name" },
            { key: "slug", column: "slug" },
            { key: "title", column: "title" },
            { key: "description", column: "description" },
            { key: "coverType", column: "cover_type" },
            { key: "coverValue", column: "cover_value" },
            { key: "iconUrl", column: "icon_url" },
            { key: "primaryColor", column: "primary_color" },
            { key: "fontFamily", column: "font_family" },
            { key: "borderRadius", column: "border_radius" },
            { key: "welcomeMessage", column: "welcome_message" },
            { key: "placeholderText", column: "placeholder_text" },
            { key: "allowFileUpload", column: "allow_file_upload" },
            { key: "maxFiles", column: "max_files" },
            { key: "maxFileSizeMb", column: "max_file_size_mb" },
            { key: "allowedFileTypes", column: "allowed_file_types" },
            { key: "persistenceType", column: "persistence_type" },
            { key: "sessionTimeoutMinutes", column: "session_timeout_minutes" },
            { key: "widgetPosition", column: "widget_position" },
            { key: "widgetButtonIcon", column: "widget_button_icon" },
            { key: "widgetButtonText", column: "widget_button_text" },
            { key: "widgetInitialState", column: "widget_initial_state" },
            { key: "rateLimitMessages", column: "rate_limit_messages" },
            { key: "rateLimitWindowSeconds", column: "rate_limit_window_seconds" }
        ];

        for (const { key, column } of fieldMappings) {
            if (input[key] !== undefined) {
                updates.push(`${column} = $${paramIndex++}`);
                values.push(input[key]);
            }
        }

        // Handle suggestedPrompts separately (needs JSON stringify)
        if (input.suggestedPrompts !== undefined) {
            updates.push(`suggested_prompts = $${paramIndex++}`);
            values.push(JSON.stringify(input.suggestedPrompts));
        }

        if (updates.length === 0) {
            return this.findById(id, userId);
        }

        values.push(id, userId);
        const query = `
            UPDATE flowmaestro.chat_interfaces
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ChatInterfaceRow) : null;
    }

    /**
     * Publish a chat interface
     */
    async publish(id: string, userId: string): Promise<ChatInterface | null> {
        const query = `
            UPDATE flowmaestro.chat_interfaces
            SET status = 'published', published_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ChatInterfaceRow) : null;
    }

    /**
     * Unpublish a chat interface
     */
    async unpublish(id: string, userId: string): Promise<ChatInterface | null> {
        const query = `
            UPDATE flowmaestro.chat_interfaces
            SET status = 'draft', published_at = NULL
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ChatInterfaceRow) : null;
    }

    /**
     * Soft delete a chat interface
     */
    async softDelete(id: string, userId: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.chat_interfaces
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Check if a slug is available for a user
     */
    async isSlugAvailable(slug: string, userId: string, excludeId?: string): Promise<boolean> {
        let query = `
            SELECT 1 FROM flowmaestro.chat_interfaces
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
     * Duplicate a chat interface
     */
    async duplicate(id: string, userId: string): Promise<ChatInterface | null> {
        // First, get the existing chat interface
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
            INSERT INTO flowmaestro.chat_interfaces (
                user_id, name, slug, agent_id, title, description,
                cover_type, cover_value, icon_url,
                primary_color, font_family, border_radius,
                welcome_message, placeholder_text, suggested_prompts,
                allow_file_upload, max_files, max_file_size_mb, allowed_file_types,
                persistence_type, session_timeout_minutes,
                widget_position, widget_button_icon, widget_button_text, widget_initial_state,
                rate_limit_messages, rate_limit_window_seconds,
                status
            )
            SELECT
                user_id, $1, $2, agent_id, title, description,
                cover_type, cover_value, icon_url,
                primary_color, font_family, border_radius,
                welcome_message, placeholder_text, suggested_prompts,
                allow_file_upload, max_files, max_file_size_mb, allowed_file_types,
                persistence_type, session_timeout_minutes,
                widget_position, widget_button_icon, widget_button_text, widget_initial_state,
                rate_limit_messages, rate_limit_window_seconds,
                'draft'
            FROM flowmaestro.chat_interfaces
            WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [`${existing.name} (Copy)`, newSlug, id, userId]);

        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ChatInterfaceRow) : null;
    }

    /**
     * Get agent ID for a published chat interface by slug
     */
    async getAgentIdBySlug(slug: string): Promise<string | null> {
        const query = `
            SELECT agent_id FROM flowmaestro.chat_interfaces
            WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
        `;

        const result = await db.query<{ agent_id: string }>(query, [slug]);
        return result.rows.length > 0 ? result.rows[0].agent_id : null;
    }

    /**
     * Get owner user ID for a published chat interface by slug
     */
    async getOwnerUserIdBySlug(slug: string): Promise<string | null> {
        const query = `
            SELECT user_id FROM flowmaestro.chat_interfaces
            WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
        `;

        const result = await db.query<{ user_id: string }>(query, [slug]);
        return result.rows.length > 0 ? result.rows[0].user_id : null;
    }

    /**
     * Map database row to ChatInterface model
     */
    private mapRow(row: ChatInterfaceRow): ChatInterface {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            slug: row.slug,
            agentId: row.agent_id,
            coverType: row.cover_type,
            coverValue: row.cover_value,
            iconUrl: row.icon_url,
            title: row.title,
            description: row.description,
            primaryColor: row.primary_color,
            fontFamily: row.font_family,
            borderRadius: row.border_radius,
            welcomeMessage: row.welcome_message,
            placeholderText: row.placeholder_text,
            suggestedPrompts: row.suggested_prompts || [],
            allowFileUpload: row.allow_file_upload,
            maxFiles: row.max_files,
            maxFileSizeMb: row.max_file_size_mb,
            allowedFileTypes: row.allowed_file_types,
            persistenceType: row.persistence_type,
            sessionTimeoutMinutes: row.session_timeout_minutes,
            widgetPosition: row.widget_position,
            widgetButtonIcon: row.widget_button_icon,
            widgetButtonText: row.widget_button_text,
            widgetInitialState: row.widget_initial_state,
            rateLimitMessages: row.rate_limit_messages,
            rateLimitWindowSeconds: row.rate_limit_window_seconds,
            status: row.status,
            publishedAt: row.published_at ? new Date(row.published_at) : null,
            sessionCount:
                typeof row.session_count === "string"
                    ? parseInt(row.session_count)
                    : row.session_count || 0,
            messageCount:
                typeof row.message_count === "string"
                    ? parseInt(row.message_count)
                    : row.message_count || 0,
            lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : null,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    /**
     * Map database row to PublicChatInterface model
     */
    private mapToPublicInterface(row: ChatInterfaceRow): PublicChatInterface {
        return {
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.description,
            coverType: row.cover_type,
            coverValue: row.cover_value,
            iconUrl: row.icon_url,
            primaryColor: row.primary_color,
            fontFamily: row.font_family,
            borderRadius: row.border_radius,
            welcomeMessage: row.welcome_message,
            placeholderText: row.placeholder_text,
            suggestedPrompts: row.suggested_prompts || [],
            allowFileUpload: row.allow_file_upload,
            maxFiles: row.max_files,
            maxFileSizeMb: row.max_file_size_mb,
            allowedFileTypes: row.allowed_file_types,
            persistenceType: row.persistence_type,
            widgetPosition: row.widget_position,
            widgetButtonIcon: row.widget_button_icon,
            widgetButtonText: row.widget_button_text,
            widgetInitialState: row.widget_initial_state
        };
    }
}
