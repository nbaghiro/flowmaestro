/**
 * Execution History - Node Logging
 *
 * Per-node execution logs for debugging and analytics.
 * Tracks execution timing, token usage, and errors.
 */

import type { JsonObject } from "@flowmaestro/shared";
import { db } from "../../../storage/database";

// ============================================================================
// TYPES
// ============================================================================

export type NodeLogStatus = "started" | "completed" | "failed" | "skipped";

export interface NodeTokenUsage {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
    provider?: string;
    costUsd?: number;
}

export interface NodeLogEntry {
    id?: number;
    executionId: string;
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    status: NodeLogStatus;
    inputData?: JsonObject;
    outputData?: JsonObject;
    errorMessage?: string;
    tokenUsage?: NodeTokenUsage;
    attemptNumber?: number;
    createdAt?: Date;
}

export interface NodeLogRecord {
    id: number;
    execution_id: string;
    node_id: string;
    node_type: string;
    node_name: string | null;
    started_at: Date;
    completed_at: Date | null;
    duration_ms: number | null;
    status: NodeLogStatus;
    input_data: string | null;
    output_data: string | null;
    error_message: string | null;
    token_usage: string | null;
    attempt_number: number | null;
    created_at: Date;
}

export interface NodeLogQueryOptions {
    executionId?: string;
    nodeId?: string;
    nodeType?: string;
    status?: NodeLogStatus;
    minDurationMs?: number;
    hasError?: boolean;
    hasTokenUsage?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: "started_at" | "duration_ms" | "created_at";
    orderDir?: "asc" | "desc";
}

export interface NodeLogSummary {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    skippedNodes: number;
    totalDurationMs: number;
    avgDurationMs: number;
    totalTokens: number;
    totalCostUsd: number;
    byNodeType: Record<
        string,
        {
            count: number;
            totalDurationMs: number;
            totalTokens: number;
        }
    >;
}

export interface NodeLoggingConfig {
    maxInputSizeBytes: number;
    maxOutputSizeBytes: number;
    logInputData: boolean;
    logOutputData: boolean;
    logTokenUsage: boolean;
    retentionDays: number;
}

export const DEFAULT_NODE_LOGGING_CONFIG: NodeLoggingConfig = {
    maxInputSizeBytes: 10 * 1024,
    maxOutputSizeBytes: 10 * 1024,
    logInputData: true,
    logOutputData: true,
    logTokenUsage: true,
    retentionDays: 30
};

// ============================================================================
// NODE LOG REPOSITORY
// ============================================================================

export class NodeLogRepository {
    private config: NodeLoggingConfig;

    constructor(config: Partial<NodeLoggingConfig> = {}) {
        this.config = { ...DEFAULT_NODE_LOGGING_CONFIG, ...config };
    }

    async logStart(entry: {
        executionId: string;
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        inputData?: JsonObject;
        attemptNumber?: number;
    }): Promise<number> {
        const inputJson =
            this.config.logInputData && entry.inputData
                ? this.truncateJson(entry.inputData, this.config.maxInputSizeBytes)
                : null;

        const query = `
            INSERT INTO flowmaestro.execution_logs (
                execution_id, node_id, node_type, node_name,
                started_at, status, input_data, attempt_number
            ) VALUES ($1, $2, $3, $4, NOW(), 'started', $5, $6)
            RETURNING id
        `;
        const result = await db.query<{ id: number }>(query, [
            entry.executionId,
            entry.nodeId,
            entry.nodeType,
            entry.nodeName || null,
            inputJson,
            entry.attemptNumber || 1
        ]);
        return result.rows[0].id;
    }

    async logComplete(
        logId: number,
        result: {
            outputData?: JsonObject;
            tokenUsage?: NodeTokenUsage;
        }
    ): Promise<void> {
        const outputJson =
            this.config.logOutputData && result.outputData
                ? this.truncateJson(result.outputData, this.config.maxOutputSizeBytes)
                : null;
        const tokenJson =
            this.config.logTokenUsage && result.tokenUsage
                ? JSON.stringify(result.tokenUsage)
                : null;

        await db.query(
            `
            UPDATE flowmaestro.execution_logs
            SET status = 'completed', completed_at = NOW(),
                duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - started_at)),
                output_data = $2, token_usage = $3
            WHERE id = $1
        `,
            [logId, outputJson, tokenJson]
        );
    }

    async logFailed(
        logId: number,
        error: {
            message: string;
            outputData?: JsonObject;
        }
    ): Promise<void> {
        const outputJson =
            this.config.logOutputData && error.outputData
                ? this.truncateJson(error.outputData, this.config.maxOutputSizeBytes)
                : null;

        await db.query(
            `
            UPDATE flowmaestro.execution_logs
            SET status = 'failed', completed_at = NOW(),
                duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - started_at)),
                output_data = $2, error_message = $3
            WHERE id = $1
        `,
            [logId, outputJson, error.message]
        );
    }

    async logSkipped(entry: {
        executionId: string;
        nodeId: string;
        nodeType: string;
        nodeName?: string;
        reason?: string;
    }): Promise<number> {
        const query = `
            INSERT INTO flowmaestro.execution_logs (
                execution_id, node_id, node_type, node_name,
                started_at, completed_at, status, error_message
            ) VALUES ($1, $2, $3, $4, NOW(), NOW(), 'skipped', $5)
            RETURNING id
        `;
        const result = await db.query<{ id: number }>(query, [
            entry.executionId,
            entry.nodeId,
            entry.nodeType,
            entry.nodeName || null,
            entry.reason || "Node skipped due to branch condition"
        ]);
        return result.rows[0].id;
    }

    async findById(id: number): Promise<NodeLogEntry | null> {
        const result = await db.query<NodeLogRecord>(
            "SELECT * FROM flowmaestro.execution_logs WHERE id = $1",
            [id]
        );
        if (result.rows.length === 0) return null;
        return this.mapRecord(result.rows[0]);
    }

    async findByExecutionId(
        executionId: string,
        options: Partial<NodeLogQueryOptions> = {}
    ): Promise<NodeLogEntry[]> {
        return this.query({ ...options, executionId });
    }

    async query(options: NodeLogQueryOptions): Promise<NodeLogEntry[]> {
        let query = "SELECT * FROM flowmaestro.execution_logs WHERE 1=1";
        const values: (string | number | boolean)[] = [];
        let paramIndex = 1;

        if (options.executionId) {
            query += ` AND execution_id = $${paramIndex++}`;
            values.push(options.executionId);
        }
        if (options.nodeId) {
            query += ` AND node_id = $${paramIndex++}`;
            values.push(options.nodeId);
        }
        if (options.nodeType) {
            query += ` AND node_type = $${paramIndex++}`;
            values.push(options.nodeType);
        }
        if (options.status) {
            query += ` AND status = $${paramIndex++}`;
            values.push(options.status);
        }
        if (options.minDurationMs) {
            query += ` AND duration_ms >= $${paramIndex++}`;
            values.push(options.minDurationMs);
        }
        if (options.hasError) {
            query += " AND error_message IS NOT NULL";
        }
        if (options.hasTokenUsage) {
            query += " AND token_usage IS NOT NULL";
        }

        const orderBy = options.orderBy || "started_at";
        const orderDir = options.orderDir || "asc";
        query += ` ORDER BY ${orderBy} ${orderDir}`;

        if (options.limit) {
            query += ` LIMIT $${paramIndex++}`;
            values.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${paramIndex++}`;
            values.push(options.offset);
        }

        const result = await db.query<NodeLogRecord>(query, values);
        return result.rows.map((row) => this.mapRecord(row));
    }

    async getSummary(executionId: string): Promise<NodeLogSummary> {
        const statsQuery = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
                COALESCE(SUM(duration_ms), 0) as total_duration,
                COALESCE(AVG(duration_ms), 0) as avg_duration,
                COALESCE(SUM((token_usage::jsonb->>'totalTokens')::int), 0) as total_tokens,
                COALESCE(SUM((token_usage::jsonb->>'costUsd')::numeric), 0) as total_cost
            FROM flowmaestro.execution_logs WHERE execution_id = $1
        `;
        const byTypeQuery = `
            SELECT node_type, COUNT(*) as count,
                COALESCE(SUM(duration_ms), 0) as total_duration,
                COALESCE(SUM((token_usage::jsonb->>'totalTokens')::int), 0) as total_tokens
            FROM flowmaestro.execution_logs WHERE execution_id = $1 GROUP BY node_type
        `;

        const [statsResult, byTypeResult] = await Promise.all([
            db.query<{
                total: string;
                completed: string;
                failed: string;
                skipped: string;
                total_duration: string;
                avg_duration: string;
                total_tokens: string;
                total_cost: string;
            }>(statsQuery, [executionId]),
            db.query<{
                node_type: string;
                count: string;
                total_duration: string;
                total_tokens: string;
            }>(byTypeQuery, [executionId])
        ]);

        const stats = statsResult.rows[0];
        const byNodeType: Record<
            string,
            { count: number; totalDurationMs: number; totalTokens: number }
        > = {};
        for (const row of byTypeResult.rows) {
            byNodeType[row.node_type] = {
                count: parseInt(row.count),
                totalDurationMs: parseInt(row.total_duration),
                totalTokens: parseInt(row.total_tokens)
            };
        }

        return {
            totalNodes: parseInt(stats.total),
            completedNodes: parseInt(stats.completed),
            failedNodes: parseInt(stats.failed),
            skippedNodes: parseInt(stats.skipped),
            totalDurationMs: parseInt(stats.total_duration),
            avgDurationMs: parseFloat(stats.avg_duration),
            totalTokens: parseInt(stats.total_tokens),
            totalCostUsd: parseFloat(stats.total_cost),
            byNodeType
        };
    }

    async deleteByExecutionId(executionId: string): Promise<number> {
        const result = await db.query(
            "DELETE FROM flowmaestro.execution_logs WHERE execution_id = $1",
            [executionId]
        );
        return result.rowCount ?? 0;
    }

    async deleteOldLogs(retentionDays?: number): Promise<number> {
        const days = retentionDays ?? this.config.retentionDays;
        if (days <= 0) return 0;
        const result = await db.query(
            `DELETE FROM flowmaestro.execution_logs WHERE created_at < NOW() - INTERVAL '${days} days'`
        );
        return result.rowCount ?? 0;
    }

    private mapRecord(record: NodeLogRecord): NodeLogEntry {
        return {
            id: record.id,
            executionId: record.execution_id,
            nodeId: record.node_id,
            nodeType: record.node_type,
            nodeName: record.node_name || undefined,
            startedAt: record.started_at,
            completedAt: record.completed_at || undefined,
            durationMs: record.duration_ms || undefined,
            status: record.status,
            inputData: record.input_data ? JSON.parse(record.input_data) : undefined,
            outputData: record.output_data ? JSON.parse(record.output_data) : undefined,
            errorMessage: record.error_message || undefined,
            tokenUsage: record.token_usage ? JSON.parse(record.token_usage) : undefined,
            attemptNumber: record.attempt_number || undefined,
            createdAt: record.created_at
        };
    }

    private truncateJson(data: JsonObject, maxBytes: number): string {
        const json = JSON.stringify(data);
        if (json.length * 2 <= maxBytes) return json;
        const truncatedLength = Math.floor(maxBytes / 2) - 50;
        return JSON.stringify({
            __truncated: true,
            __originalLength: json.length,
            __preview: json.substring(0, truncatedLength)
        });
    }
}

export const nodeLogRepository = new NodeLogRepository();

export async function logNodeExecution(entry: NodeLogEntry): Promise<number> {
    const logId = await nodeLogRepository.logStart({
        executionId: entry.executionId,
        nodeId: entry.nodeId,
        nodeType: entry.nodeType,
        nodeName: entry.nodeName,
        inputData: entry.inputData,
        attemptNumber: entry.attemptNumber
    });

    if (entry.status === "completed") {
        await nodeLogRepository.logComplete(logId, {
            outputData: entry.outputData,
            tokenUsage: entry.tokenUsage
        });
    } else if (entry.status === "failed") {
        await nodeLogRepository.logFailed(logId, {
            message: entry.errorMessage || "Unknown error",
            outputData: entry.outputData
        });
    }

    return logId;
}
