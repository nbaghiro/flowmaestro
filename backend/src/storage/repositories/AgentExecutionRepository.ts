import type { JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import {
    AgentExecutionModel,
    AgentMessageModel,
    CreateAgentExecutionInput,
    UpdateAgentExecutionInput,
    CreateAgentMessageInput,
    AgentExecutionStatus,
    MessageRole
} from "../models/AgentExecution";

interface AgentExecutionRow {
    id: string;
    agent_id: string;
    user_id: string;
    thread_id: string;
    status: string;
    thread_history: string | JsonValue[];
    iterations: number;
    tool_calls_count: number;
    metadata: string | Record<string, JsonValue>;
    started_at: string | Date;
    completed_at: string | Date | null;
    error: string | null;
    created_at: string | Date;
    updated_at: string | Date;
}

interface AgentMessageRow {
    id: string;
    execution_id: string;
    thread_id: string;
    role: string;
    content: string;
    tool_calls: string | JsonValue[] | null;
    tool_name: string | null;
    tool_call_id: string | null;
    attachments: string | JsonValue[] | null;
    created_at: string | Date;
}

export class AgentExecutionRepository {
    async create(input: CreateAgentExecutionInput): Promise<AgentExecutionModel> {
        const query = `
            INSERT INTO flowmaestro.agent_executions (
                agent_id, user_id, thread_id, status, thread_history,
                iterations, tool_calls_count, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            input.agent_id,
            input.user_id,
            input.thread_id,
            input.status || "running",
            JSON.stringify(input.thread_history || []),
            input.iterations || 0,
            input.tool_calls_count || 0,
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<AgentExecutionRow>(query, values);
        return this.mapExecutionRow(result.rows[0] as AgentExecutionRow);
    }

    async findById(id: string): Promise<AgentExecutionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE id = $1
        `;

        const result = await db.query<AgentExecutionRow>(query, [id]);
        return result.rows.length > 0
            ? this.mapExecutionRow(result.rows[0] as AgentExecutionRow)
            : null;
    }

    async findByIdAndUserId(id: string, userId: string): Promise<AgentExecutionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE id = $1 AND user_id = $2
        `;

        const result = await db.query<AgentExecutionRow>(query, [id, userId]);
        return result.rows.length > 0
            ? this.mapExecutionRow(result.rows[0] as AgentExecutionRow)
            : null;
    }

    async findByAgentId(
        agentId: string,
        options: { limit?: number; offset?: number; status?: string } = {}
    ): Promise<{ executions: AgentExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;
        const { status } = options;

        // Build WHERE clause
        const whereConditions = ["agent_id = $1"];
        const queryParams: unknown[] = [agentId];
        let paramIndex = 2;

        if (status) {
            whereConditions.push(`status = $${paramIndex++}`);
            queryParams.push(status);
        }

        const whereClause = whereConditions.join(" AND ");

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.agent_executions
            WHERE ${whereClause}
        `;

        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE ${whereClause}
            ORDER BY started_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, queryParams),
            db.query<AgentExecutionRow>(query, [...queryParams, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) =>
                this.mapExecutionRow(row as AgentExecutionRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findByUserId(
        userId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: AgentExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.agent_executions
            WHERE user_id = $1
        `;

        const query = `
            SELECT * FROM flowmaestro.agent_executions
            WHERE user_id = $1
            ORDER BY started_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [userId]),
            db.query<AgentExecutionRow>(query, [userId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) =>
                this.mapExecutionRow(row as AgentExecutionRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async update(
        id: string,
        input: UpdateAgentExecutionInput
    ): Promise<AgentExecutionModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.thread_history !== undefined) {
            updates.push(`thread_history = $${paramIndex++}`);
            values.push(JSON.stringify(input.thread_history));
        }

        if (input.iterations !== undefined) {
            updates.push(`iterations = $${paramIndex++}`);
            values.push(input.iterations);
        }

        if (input.tool_calls_count !== undefined) {
            updates.push(`tool_calls_count = $${paramIndex++}`);
            values.push(input.tool_calls_count);
        }

        if (input.completed_at !== undefined) {
            updates.push(`completed_at = $${paramIndex++}`);
            values.push(input.completed_at);
        }

        if (input.error !== undefined) {
            updates.push(`error = $${paramIndex++}`);
            values.push(input.error);
        }

        if (input.metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(JSON.stringify(input.metadata));
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.agent_executions
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        const result = await db.query<AgentExecutionRow>(query, values);
        return result.rows.length > 0
            ? this.mapExecutionRow(result.rows[0] as AgentExecutionRow)
            : null;
    }

    async addMessage(input: CreateAgentMessageInput): Promise<AgentMessageModel> {
        const query = `
            INSERT INTO flowmaestro.agent_messages (
                execution_id, role, content, tool_calls, tool_name, tool_call_id, attachments
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const values = [
            input.execution_id,
            input.role,
            input.content,
            input.tool_calls ? JSON.stringify(input.tool_calls) : null,
            input.tool_name || null,
            input.tool_call_id || null,
            input.attachments ? JSON.stringify(input.attachments) : "[]"
        ];

        const result = await db.query<AgentMessageRow>(query, values);
        return this.mapMessageRow(result.rows[0] as AgentMessageRow);
    }

    async getMessages(
        executionId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<AgentMessageModel[]> {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM flowmaestro.agent_messages
            WHERE execution_id = $1
            ORDER BY created_at ASC, id ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query<AgentMessageRow>(query, [executionId, limit, offset]);
        return result.rows.map((row) => this.mapMessageRow(row as AgentMessageRow));
    }

    async getMessagesByThread(
        threadId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<AgentMessageModel[]> {
        const limit = options.limit || 1000;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM flowmaestro.agent_messages
            WHERE thread_id = $1
            ORDER BY created_at ASC, id ASC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query<AgentMessageRow>(query, [threadId, limit, offset]);
        return result.rows.map((row) => this.mapMessageRow(row as AgentMessageRow));
    }

    async deleteExecution(id: string): Promise<boolean> {
        // This will cascade delete messages
        const query = `
            DELETE FROM flowmaestro.agent_executions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Save messages to thread (thread-aware persistence)
     * This saves messages to agent_messages table with thread_id for persistence across executions
     */
    async saveMessagesToThread(
        threadId: string,
        executionId: string,
        messages: Array<{
            id: string;
            role: string;
            content: string;
            timestamp?: string | Date;
            tool_calls?: unknown[];
            tool_name?: string;
            tool_call_id?: string;
            attachments?: unknown[];
        }>
    ): Promise<void> {
        if (messages.length === 0) {
            return;
        }

        // Build multi-row insert query
        const values: unknown[] = [];
        const valueStrings: string[] = [];
        let paramIndex = 1;

        for (const msg of messages) {
            valueStrings.push(
                `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
            );
            values.push(
                threadId,
                executionId,
                msg.role,
                msg.content,
                msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
                msg.tool_name || null,
                msg.tool_call_id || null,
                msg.attachments ? JSON.stringify(msg.attachments) : "[]",
                msg.timestamp || new Date()
            );
        }

        const query = `
            INSERT INTO flowmaestro.agent_messages (
                thread_id, execution_id, role, content, tool_calls, tool_name, tool_call_id, attachments, created_at
            )
            VALUES ${valueStrings.join(", ")}
            ON CONFLICT DO NOTHING
        `;

        await db.query(query, values);
    }

    private mapExecutionRow(row: AgentExecutionRow): AgentExecutionModel {
        return {
            ...row,
            status: row.status as AgentExecutionStatus,
            thread_history:
                typeof row.thread_history === "string"
                    ? JSON.parse(row.thread_history)
                    : row.thread_history,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            started_at: new Date(row.started_at),
            completed_at: row.completed_at ? new Date(row.completed_at) : null
        };
    }

    private mapMessageRow(row: AgentMessageRow): AgentMessageModel {
        return {
            ...row,
            role: row.role as MessageRole,
            tool_calls: row.tool_calls
                ? typeof row.tool_calls === "string"
                    ? JSON.parse(row.tool_calls)
                    : row.tool_calls
                : null,
            attachments: row.attachments
                ? typeof row.attachments === "string"
                    ? JSON.parse(row.attachments)
                    : row.attachments
                : [],
            created_at: new Date(row.created_at)
        };
    }
}
