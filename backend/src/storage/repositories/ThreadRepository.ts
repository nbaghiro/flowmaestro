import type { JsonObject } from "@flowmaestro/shared";
import { db } from "../database";
import {
    ThreadModel,
    CreateThreadInput,
    UpdateThreadInput,
    ThreadListFilter,
    ThreadStatus
} from "../models/Thread";

// Database row interface
interface ThreadRow {
    id: string;
    user_id: string;
    agent_id: string;
    title: string | null;
    status: ThreadStatus;
    metadata: JsonObject | string;
    created_at: string | Date;
    updated_at: string | Date;
    last_message_at: string | Date | null;
    archived_at: string | Date | null;
    deleted_at: string | Date | null;
}

export class ThreadRepository {
    /**
     * Create a new thread
     */
    async create(input: CreateThreadInput): Promise<ThreadModel> {
        const query = `
            INSERT INTO flowmaestro.threads (
                user_id, agent_id, title, status, metadata
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.agent_id,
            input.title || null,
            input.status || "active",
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as ThreadRow);
    }

    /**
     * Find thread by ID
     */
    async findById(id: string): Promise<ThreadModel | null> {
        const query = `
            SELECT * FROM flowmaestro.threads
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ThreadRow) : null;
    }

    /**
     * Find thread by ID and user ID (for access control)
     */
    async findByIdAndUserId(id: string, userId: string): Promise<ThreadModel | null> {
        const query = `
            SELECT * FROM flowmaestro.threads
            WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ThreadRow) : null;
    }

    /**
     * List threads with filtering and pagination
     */
    async list(filter: ThreadListFilter): Promise<{ threads: ThreadModel[]; total: number }> {
        const limit = filter.limit || 50;
        const offset = filter.offset || 0;

        // Build where clause
        const whereClauses: string[] = ["deleted_at IS NULL", "user_id = $1"];
        const params: unknown[] = [filter.user_id];
        let paramIndex = 2;

        if (filter.agent_id) {
            whereClauses.push(`agent_id = $${paramIndex++}`);
            params.push(filter.agent_id);
        }

        if (filter.status) {
            whereClauses.push(`status = $${paramIndex++}`);
            params.push(filter.status);
        }

        if (filter.search) {
            whereClauses.push(`title ILIKE $${paramIndex++}`);
            params.push(`%${filter.search}%`);
        }

        const whereClause = whereClauses.join(" AND ");

        // Count query
        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.threads
            WHERE ${whereClause}
        `;

        // Data query - ordered by creation time (newest first)
        const dataQuery = `
            SELECT * FROM flowmaestro.threads
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const dataParams = [...params, limit, offset];

        const [countResult, dataResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, params),
            db.query(dataQuery, dataParams)
        ]);

        return {
            threads: dataResult.rows.map((row) => this.mapRow(row as ThreadRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Get threads for a specific agent and user
     */
    async findByAgentAndUser(
        agentId: string,
        userId: string,
        options: { limit?: number; offset?: number; status?: ThreadStatus } = {}
    ): Promise<{ threads: ThreadModel[]; total: number }> {
        return this.list({
            user_id: userId,
            agent_id: agentId,
            status: options.status,
            limit: options.limit,
            offset: options.offset
        });
    }

    /**
     * Get most recent active thread for agent and user
     */
    async findMostRecentActive(agentId: string, userId: string): Promise<ThreadModel | null> {
        const query = `
            SELECT * FROM flowmaestro.threads
            WHERE agent_id = $1
              AND user_id = $2
              AND status = 'active'
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await db.query(query, [agentId, userId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ThreadRow) : null;
    }

    /**
     * Update thread
     */
    async update(id: string, input: UpdateThreadInput): Promise<ThreadModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.title !== undefined) {
            updates.push(`title = $${paramIndex++}`);
            values.push(input.title);
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);

            // Auto-set archived_at when changing to archived status
            if (input.status === "archived") {
                updates.push("archived_at = CURRENT_TIMESTAMP");
            }
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (input.archived_at !== undefined) {
            updates.push(`archived_at = $${paramIndex++}`);
            values.push(input.archived_at);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.threads
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ThreadRow) : null;
    }

    /**
     * Update thread title
     */
    async updateTitle(id: string, title: string): Promise<ThreadModel | null> {
        return this.update(id, { title });
    }

    /**
     * Archive thread
     */
    async archive(id: string): Promise<ThreadModel | null> {
        return this.update(id, { status: "archived", archived_at: new Date() });
    }

    /**
     * Unarchive thread
     */
    async unarchive(id: string): Promise<ThreadModel | null> {
        return this.update(id, { status: "active", archived_at: null });
    }

    /**
     * Soft delete thread
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.threads
            SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Hard delete thread (use with caution - cascades to messages, embeddings, etc.)
     */
    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.threads
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Get thread statistics
     */
    async getStats(threadId: string): Promise<{
        message_count: number;
        execution_count: number;
        first_message_at: Date | null;
        last_message_at: Date | null;
    }> {
        const query = `
            SELECT
                COUNT(DISTINCT m.id) as message_count,
                COUNT(DISTINCT e.id) as execution_count,
                MIN(m.created_at) as first_message_at,
                MAX(m.created_at) as last_message_at
            FROM flowmaestro.threads t
            LEFT JOIN flowmaestro.agent_messages m ON m.thread_id = t.id
            LEFT JOIN flowmaestro.agent_executions e ON e.thread_id = t.id
            WHERE t.id = $1
            GROUP BY t.id
        `;

        const result = await db.query(query, [threadId]);

        if (result.rows.length === 0) {
            return {
                message_count: 0,
                execution_count: 0,
                first_message_at: null,
                last_message_at: null
            };
        }

        const row = result.rows[0];
        return {
            message_count: parseInt(row.message_count) || 0,
            execution_count: parseInt(row.execution_count) || 0,
            first_message_at: row.first_message_at ? new Date(row.first_message_at) : null,
            last_message_at: row.last_message_at ? new Date(row.last_message_at) : null
        };
    }

    /**
     * Map database row to model
     */
    private mapRow(row: ThreadRow): ThreadModel {
        return {
            id: row.id,
            user_id: row.user_id,
            agent_id: row.agent_id,
            title: row.title,
            status: row.status,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            last_message_at: row.last_message_at ? new Date(row.last_message_at) : null,
            archived_at: row.archived_at ? new Date(row.archived_at) : null,
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
