import { ExecutionPauseContext, ExecutionStatus, JsonValue } from "@flowmaestro/shared";
import { db } from "../database";
import { ExecutionModel, CreateExecutionInput, UpdateExecutionInput } from "../models/Execution";

// Database row interface
interface ExecutionRow {
    id: string;
    workflow_id: string;
    status: ExecutionStatus;
    inputs: Record<string, JsonValue> | string | null;
    outputs: Record<string, JsonValue> | string | null;
    current_state: JsonValue | string | null;
    pause_context: ExecutionPauseContext | string | null;
    error: string | null;
    started_at: string | Date | null;
    completed_at: string | Date | null;
    created_at: string | Date;
    deleted_at: string | Date | null;
}

export class ExecutionRepository {
    async create(input: CreateExecutionInput): Promise<ExecutionModel> {
        const query = `
            INSERT INTO flowmaestro.executions (workflow_id, inputs, status)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const values = [
            input.workflow_id,
            input.inputs ? JSON.stringify(input.inputs) : null,
            "pending" as ExecutionStatus
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as ExecutionRow);
    }

    async findById(id: string): Promise<ExecutionModel | null> {
        const query = `
            SELECT * FROM flowmaestro.executions
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ExecutionRow) : null;
    }

    /**
     * Find execution by ID with workspace verification for multi-tenant isolation.
     * Joins with workflows table to ensure the execution belongs to the specified workspace.
     */
    async findByIdAndWorkspaceId(id: string, workspaceId: string): Promise<ExecutionModel | null> {
        const query = `
            SELECT e.* FROM flowmaestro.executions e
            INNER JOIN flowmaestro.workflows w ON e.workflow_id = w.id
            WHERE e.id = $1 AND w.workspace_id = $2 AND e.deleted_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ExecutionRow) : null;
    }

    async findByWorkflowId(
        workflowId: string,
        options: { limit?: number; offset?: number } = {}
    ): Promise<{ executions: ExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.executions
            WHERE workflow_id = $1 AND deleted_at IS NULL
        `;

        const query = `
            SELECT * FROM flowmaestro.executions
            WHERE workflow_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, [workflowId]),
            db.query(query, [workflowId, limit, offset])
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapRow(row as ExecutionRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findByStatus(
        status: ExecutionStatus,
        options: { limit?: number; offset?: number } = {}
    ): Promise<ExecutionModel[]> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM flowmaestro.executions
            WHERE status = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [status, limit, offset]);
        return result.rows.map((row) => this.mapRow(row as ExecutionRow));
    }

    async update(id: string, input: UpdateExecutionInput): Promise<ExecutionModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.outputs !== undefined) {
            updates.push(`outputs = $${paramIndex++}`);
            values.push(JSON.stringify(input.outputs));
        }

        if (input.current_state !== undefined) {
            updates.push(`current_state = $${paramIndex++}`);
            values.push(JSON.stringify(input.current_state));
        }

        if (input.pause_context !== undefined) {
            updates.push(`pause_context = $${paramIndex++}`);
            values.push(input.pause_context ? JSON.stringify(input.pause_context) : null);
        }

        if (input.error !== undefined) {
            updates.push(`error = $${paramIndex++}`);
            values.push(input.error);
        }

        if (input.started_at !== undefined) {
            updates.push(`started_at = $${paramIndex++}`);
            values.push(input.started_at);
        }

        if (input.completed_at !== undefined) {
            updates.push(`completed_at = $${paramIndex++}`);
            values.push(input.completed_at);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.executions
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as ExecutionRow) : null;
    }

    /**
     * Soft delete an execution by setting deleted_at timestamp.
     * Execution data is preserved for audit/compliance purposes.
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.executions
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Permanently delete an execution from the database.
     * Use with caution - this removes audit trail.
     */
    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.executions
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    async getLogs(
        executionId: string,
        options: { limit?: number; offset?: number; level?: string; nodeId?: string } = {}
    ): Promise<{ logs: unknown[]; total: number }> {
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.execution_logs
            WHERE execution_id = $1
        `;

        let query = `
            SELECT * FROM flowmaestro.execution_logs
            WHERE execution_id = $1
        `;

        const countParams: unknown[] = [executionId];
        const queryParams: unknown[] = [executionId];
        let paramIndex = 2;

        if (options.level) {
            countQuery += ` AND level = $${paramIndex}`;
            query += ` AND level = $${paramIndex}`;
            countParams.push(options.level);
            queryParams.push(options.level);
            paramIndex++;
        }

        if (options.nodeId) {
            countQuery += ` AND node_id = $${paramIndex}`;
            query += ` AND node_id = $${paramIndex}`;
            countParams.push(options.nodeId);
            queryParams.push(options.nodeId);
            paramIndex++;
        }

        query += ` ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);

        const [countResult, logsResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countParams),
            db.query(query, queryParams)
        ]);

        return {
            logs: logsResult.rows.map((row) => ({
                ...row,
                metadata: row.metadata
                    ? typeof row.metadata === "string"
                        ? JSON.parse(row.metadata)
                        : row.metadata
                    : null,
                created_at: new Date(row.created_at)
            })),
            total: parseInt(countResult.rows[0].count)
        };
    }

    async findAll(
        options: { limit?: number; offset?: number; status?: ExecutionStatus } = {}
    ): Promise<{ executions: ExecutionModel[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        let countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.executions
            WHERE deleted_at IS NULL
        `;

        let query = `
            SELECT * FROM flowmaestro.executions
            WHERE deleted_at IS NULL
        `;

        const countParams: unknown[] = [];
        const queryParams: unknown[] = [];

        if (options.status) {
            countQuery += " AND status = $1";
            query += " AND status = $1";
            countParams.push(options.status);
            queryParams.push(options.status);
        }

        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const [countResult, executionsResult] = await Promise.all([
            db.query<{ count: string }>(
                countQuery,
                countParams.length > 0 ? countParams : undefined
            ),
            db.query(query, queryParams)
        ]);

        return {
            executions: executionsResult.rows.map((row) => this.mapRow(row as ExecutionRow)),
            total: parseInt(countResult.rows[0].count)
        };
    }

    private mapRow(row: ExecutionRow): ExecutionModel {
        return {
            id: row.id,
            workflow_id: row.workflow_id,
            status: row.status,
            inputs: row.inputs
                ? typeof row.inputs === "string"
                    ? JSON.parse(row.inputs)
                    : row.inputs
                : null,
            outputs: row.outputs
                ? typeof row.outputs === "string"
                    ? JSON.parse(row.outputs)
                    : row.outputs
                : null,
            current_state: row.current_state
                ? typeof row.current_state === "string"
                    ? JSON.parse(row.current_state)
                    : row.current_state
                : null,
            pause_context: row.pause_context
                ? typeof row.pause_context === "string"
                    ? JSON.parse(row.pause_context)
                    : row.pause_context
                : null,
            error: row.error,
            created_at: new Date(row.created_at),
            started_at: row.started_at ? new Date(row.started_at) : null,
            completed_at: row.completed_at ? new Date(row.completed_at) : null,
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }
}
