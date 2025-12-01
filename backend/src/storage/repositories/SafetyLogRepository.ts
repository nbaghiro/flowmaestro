/**
 * Safety Log Repository
 * Manages safety event logging and metrics
 */

import { db } from "../database";
import type { SafetyCheckType, SafetyAction } from "../../core/safety/types";

export interface SafetyLogModel {
    id: string;
    user_id: string;
    agent_id: string;
    execution_id: string | null;
    thread_id: string | null;
    check_type: SafetyCheckType;
    action: SafetyAction;
    direction: "input" | "output";
    original_content: string | null;
    redacted_content: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
}

export interface CreateSafetyLogInput {
    user_id: string;
    agent_id: string;
    execution_id?: string;
    thread_id?: string;
    check_type: SafetyCheckType;
    action: SafetyAction;
    direction: "input" | "output";
    original_content?: string;
    redacted_content?: string;
    metadata?: Record<string, unknown>;
}

export interface SafetyMetrics {
    agent_id: string;
    check_type: SafetyCheckType;
    action: SafetyAction;
    direction: "input" | "output";
    event_count: number;
    day: Date;
}

export class SafetyLogRepository {
    /**
     * Create safety log entry
     */
    async create(input: CreateSafetyLogInput): Promise<SafetyLogModel> {
        const query = `
            INSERT INTO flowmaestro.safety_logs (
                user_id, agent_id, execution_id, thread_id,
                check_type, action, direction,
                original_content, redacted_content, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            input.user_id,
            input.agent_id,
            input.execution_id || null,
            input.thread_id || null,
            input.check_type,
            input.action,
            input.direction,
            input.original_content || null,
            input.redacted_content || null,
            JSON.stringify(input.metadata || {})
        ];

        const result = await db.query<SafetyLogModel>(query, values);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Get safety logs for an agent
     */
    async findByAgentId(
        agentId: string,
        options?: {
            limit?: number;
            offset?: number;
            checkType?: SafetyCheckType;
            action?: SafetyAction;
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<SafetyLogModel[]> {
        const conditions: string[] = ["agent_id = $1"];
        const values: unknown[] = [agentId];
        let paramCount = 1;

        if (options?.checkType) {
            paramCount++;
            conditions.push(`check_type = $${paramCount}`);
            values.push(options.checkType);
        }

        if (options?.action) {
            paramCount++;
            conditions.push(`action = $${paramCount}`);
            values.push(options.action);
        }

        if (options?.startDate) {
            paramCount++;
            conditions.push(`created_at >= $${paramCount}`);
            values.push(options.startDate);
        }

        if (options?.endDate) {
            paramCount++;
            conditions.push(`created_at <= $${paramCount}`);
            values.push(options.endDate);
        }

        const query = `
            SELECT * FROM flowmaestro.safety_logs
            WHERE ${conditions.join(" AND ")}
            ORDER BY created_at DESC
            LIMIT ${options?.limit || 100}
            OFFSET ${options?.offset || 0}
        `;

        const result = await db.query<SafetyLogModel>(query, values);
        return result.rows.map((row: SafetyLogModel) => this.mapRow(row));
    }

    /**
     * Get safety logs for a thread
     */
    async findByThreadId(threadId: string, limit = 100): Promise<SafetyLogModel[]> {
        const query = `
            SELECT * FROM flowmaestro.safety_logs
            WHERE thread_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await db.query<SafetyLogModel>(query, [threadId, limit]);
        return result.rows.map((row: SafetyLogModel) => this.mapRow(row));
    }

    /**
     * Get safety metrics for an agent
     */
    async getMetrics(
        agentId: string,
        options?: {
            startDate?: Date;
            endDate?: Date;
            checkType?: SafetyCheckType;
        }
    ): Promise<SafetyMetrics[]> {
        const conditions: string[] = ["agent_id = $1"];
        const values: unknown[] = [agentId];
        let paramCount = 1;

        if (options?.checkType) {
            paramCount++;
            conditions.push(`check_type = $${paramCount}`);
            values.push(options.checkType);
        }

        if (options?.startDate) {
            paramCount++;
            conditions.push(`day >= $${paramCount}`);
            values.push(options.startDate);
        }

        if (options?.endDate) {
            paramCount++;
            conditions.push(`day <= $${paramCount}`);
            values.push(options.endDate);
        }

        const query = `
            SELECT * FROM flowmaestro.safety_metrics
            WHERE ${conditions.join(" AND ")}
            ORDER BY day DESC, check_type, action
        `;

        const result = await db.query<SafetyMetrics>(query, values);
        return result.rows;
    }

    /**
     * Get recent blocked attempts for an agent
     */
    async getRecentBlocked(agentId: string, limit = 50): Promise<SafetyLogModel[]> {
        const query = `
            SELECT * FROM flowmaestro.safety_logs
            WHERE agent_id = $1 AND action = 'block'
            ORDER BY created_at DESC
            LIMIT $2
        `;

        const result = await db.query<SafetyLogModel>(query, [agentId, limit]);
        return result.rows.map((row: SafetyLogModel) => this.mapRow(row));
    }

    /**
     * Delete old safety logs (for compliance/data retention)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const query = `
            DELETE FROM flowmaestro.safety_logs
            WHERE created_at < NOW() - INTERVAL '${days} days'
        `;

        const result = await db.query(query);
        return result.rowCount || 0;
    }

    /**
     * Map database row to model
     */
    private mapRow(row: SafetyLogModel): SafetyLogModel {
        return {
            ...row,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            created_at: new Date(row.created_at)
        };
    }
}
