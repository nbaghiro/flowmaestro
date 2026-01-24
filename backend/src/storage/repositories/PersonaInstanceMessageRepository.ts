/**
 * Persona Instance Message Repository
 *
 * Handles database operations for persona instance conversation messages.
 */

import { db } from "../database";
import type { ToolCall } from "../models/AgentExecution";

// =============================================================================
// Types
// =============================================================================

export interface PersonaInstanceMessageRow {
    id: string;
    instance_id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_calls?: ToolCall[];
    tool_name?: string;
    tool_call_id?: string;
    metadata: Record<string, unknown>;
    created_at: Date;
}

export interface PersonaInstanceMessageModel {
    id: string;
    instance_id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_calls?: ToolCall[];
    tool_name?: string;
    tool_call_id?: string;
    metadata: Record<string, unknown>;
    created_at: Date;
}

export interface CreatePersonaMessageInput {
    instance_id: string;
    thread_id?: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_calls?: ToolCall[];
    tool_name?: string;
    tool_call_id?: string;
    metadata?: Record<string, unknown>;
}

// =============================================================================
// Repository
// =============================================================================

export class PersonaInstanceMessageRepository {
    /**
     * Create a new message
     */
    async create(input: CreatePersonaMessageInput): Promise<PersonaInstanceMessageModel> {
        const metadata = {
            ...input.metadata,
            ...(input.thread_id && { thread_id: input.thread_id }),
            ...(input.tool_calls && { tool_calls: input.tool_calls }),
            ...(input.tool_name && { tool_name: input.tool_name }),
            ...(input.tool_call_id && { tool_call_id: input.tool_call_id })
        };

        const result = await db.query<PersonaInstanceMessageRow>(
            `INSERT INTO flowmaestro.persona_instance_messages
             (instance_id, role, content, metadata)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [input.instance_id, input.role, input.content, JSON.stringify(metadata)]
        );

        return this.mapRow(result.rows[0]);
    }

    /**
     * Find messages by instance ID
     */
    async findByInstanceId(
        instanceId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<PersonaInstanceMessageModel[]> {
        const limit = options?.limit || 100;
        const offset = options?.offset || 0;

        const result = await db.query<PersonaInstanceMessageRow>(
            `SELECT * FROM flowmaestro.persona_instance_messages
             WHERE instance_id = $1
             ORDER BY created_at ASC
             LIMIT $2 OFFSET $3`,
            [instanceId, limit, offset]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Find latest messages by instance ID (for conversation context)
     */
    async findLatestByInstanceId(
        instanceId: string,
        limit: number = 50
    ): Promise<PersonaInstanceMessageModel[]> {
        const result = await db.query<PersonaInstanceMessageRow>(
            `SELECT * FROM (
                SELECT * FROM flowmaestro.persona_instance_messages
                WHERE instance_id = $1
                ORDER BY created_at DESC
                LIMIT $2
             ) sub
             ORDER BY created_at ASC`,
            [instanceId, limit]
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    /**
     * Count messages for an instance
     */
    async countByInstanceId(instanceId: string): Promise<number> {
        const result = await db.query<{ count: string }>(
            `SELECT COUNT(*) as count FROM flowmaestro.persona_instance_messages
             WHERE instance_id = $1`,
            [instanceId]
        );

        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Delete all messages for an instance
     */
    async deleteByInstanceId(instanceId: string): Promise<number> {
        const result = await db.query(
            `DELETE FROM flowmaestro.persona_instance_messages
             WHERE instance_id = $1`,
            [instanceId]
        );

        return result.rowCount || 0;
    }

    /**
     * Map database row to model
     */
    private mapRow(row: PersonaInstanceMessageRow): PersonaInstanceMessageModel {
        const metadata =
            typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata || {};

        return {
            id: row.id,
            instance_id: row.instance_id,
            role: row.role,
            content: row.content,
            tool_calls: metadata.tool_calls,
            tool_name: metadata.tool_name,
            tool_call_id: metadata.tool_call_id,
            metadata,
            created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at)
        };
    }
}
