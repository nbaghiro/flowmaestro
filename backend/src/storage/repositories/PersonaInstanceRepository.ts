import type {
    PersonaCategory,
    PersonaStructuredInputs,
    PersonaInstanceProgress
} from "@flowmaestro/shared";
import { db } from "../database";
import type {
    PersonaInstanceModel,
    PersonaInstanceSummary,
    CreatePersonaInstanceInput,
    UpdatePersonaInstanceInput,
    PersonaInstanceQueryOptions,
    PersonaInstanceStatus,
    PersonaInstanceCompletionReason,
    SandboxState,
    PersonaNotificationConfig,
    PersonaAdditionalContext,
    PersonaInstanceDashboard
} from "../models/PersonaInstance";

/**
 * Database row interface for persona_instances table
 */
interface PersonaInstanceRow {
    id: string;
    persona_definition_id: string;
    user_id: string;
    workspace_id: string;
    task_title: string | null;
    task_description: string | null;
    additional_context: PersonaAdditionalContext | string;
    structured_inputs: PersonaStructuredInputs | string;
    thread_id: string | null;
    execution_id: string | null;
    status: string;
    max_duration_hours: number | string | null;
    max_cost_credits: number | string | null;
    progress: PersonaInstanceProgress | string | null;
    started_at: string | Date | null;
    completed_at: string | Date | null;
    duration_seconds: number | string | null;
    accumulated_cost_credits: number | string;
    iteration_count: number | string;
    completion_reason: string | null;
    notification_config: PersonaNotificationConfig | string;
    sandbox_id: string | null;
    sandbox_state: string | null;
    created_at: string | Date;
    updated_at: string | Date;
    deleted_at: string | Date | null;
}

/**
 * Database row interface for summary queries with joined persona data
 */
interface PersonaInstanceSummaryRow extends PersonaInstanceRow {
    persona_name: string;
    persona_slug: string;
    persona_title: string;
    persona_avatar_url: string | null;
    persona_category: string;
}

export class PersonaInstanceRepository {
    /**
     * Create a new persona instance
     */
    async create(input: CreatePersonaInstanceInput): Promise<PersonaInstanceModel> {
        const defaultNotificationConfig: PersonaNotificationConfig = {
            on_approval_needed: true,
            on_completion: true,
            slack_channel_id: null,
            ...input.notification_config
        };

        const query = `
            INSERT INTO flowmaestro.persona_instances (
                persona_definition_id, user_id, workspace_id,
                task_title, task_description, additional_context,
                structured_inputs,
                max_duration_hours, max_cost_credits, notification_config
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const values = [
            input.persona_definition_id,
            input.user_id,
            input.workspace_id,
            input.task_title || null,
            input.task_description || null,
            JSON.stringify(input.additional_context || {}),
            JSON.stringify(input.structured_inputs || {}),
            input.max_duration_hours || null,
            input.max_cost_credits || null,
            JSON.stringify(defaultNotificationConfig)
        ];

        const result = await db.query(query, values);
        return this.mapRow(result.rows[0] as PersonaInstanceRow);
    }

    /**
     * Find persona instance by ID
     */
    async findById(id: string): Promise<PersonaInstanceModel | null> {
        const query = `
            SELECT * FROM flowmaestro.persona_instances
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaInstanceRow) : null;
    }

    /**
     * Find persona instance by ID and workspace ID
     */
    async findByIdAndWorkspaceId(
        id: string,
        workspaceId: string
    ): Promise<PersonaInstanceModel | null> {
        const query = `
            SELECT * FROM flowmaestro.persona_instances
            WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id, workspaceId]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaInstanceRow) : null;
    }

    /**
     * Find persona instances by user with optional filtering
     */
    async findByUserId(
        userId: string,
        workspaceId: string,
        options: PersonaInstanceQueryOptions = {}
    ): Promise<{ instances: PersonaInstanceSummary[]; total: number }> {
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const conditions: string[] = [
            "pi.user_id = $1",
            "pi.workspace_id = $2",
            "pi.deleted_at IS NULL"
        ];
        const values: unknown[] = [userId, workspaceId];
        let paramIndex = 3;

        // Status filter
        if (options.status !== undefined) {
            if (Array.isArray(options.status)) {
                const placeholders = options.status.map(() => `$${paramIndex++}`).join(", ");
                conditions.push(`pi.status IN (${placeholders})`);
                values.push(...options.status);
            } else {
                conditions.push(`pi.status = $${paramIndex++}`);
                values.push(options.status);
            }
        }

        // Persona filter
        if (options.persona_definition_id !== undefined) {
            conditions.push(`pi.persona_definition_id = $${paramIndex++}`);
            values.push(options.persona_definition_id);
        }

        const whereClause = `WHERE ${conditions.join(" AND ")}`;

        // Count query
        const countQuery = `
            SELECT COUNT(*) as count
            FROM flowmaestro.persona_instances pi
            ${whereClause}
        `;

        // Data query with persona join
        const dataQuery = `
            SELECT
                pi.*,
                pd.name as persona_name,
                pd.slug as persona_slug,
                pd.title as persona_title,
                pd.avatar_url as persona_avatar_url,
                pd.category as persona_category
            FROM flowmaestro.persona_instances pi
            JOIN flowmaestro.persona_definitions pd ON pi.persona_definition_id = pd.id
            ${whereClause}
            ORDER BY pi.updated_at DESC
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;

        const countValues = values.slice(0);
        values.push(limit, offset);

        const [countResult, dataResult] = await Promise.all([
            db.query<{ count: string }>(countQuery, countValues),
            db.query(dataQuery, values)
        ]);

        return {
            instances: dataResult.rows.map((row) =>
                this.mapSummaryRow(row as PersonaInstanceSummaryRow)
            ),
            total: parseInt(countResult.rows[0].count)
        };
    }

    /**
     * Get dashboard data for user (optimized for dashboard view)
     */
    async getDashboard(userId: string, workspaceId: string): Promise<PersonaInstanceDashboard> {
        // Query for instances needing attention (waiting_approval or recently completed)
        const needsAttentionQuery = `
            SELECT
                pi.*,
                pd.name as persona_name,
                pd.slug as persona_slug,
                pd.title as persona_title,
                pd.avatar_url as persona_avatar_url,
                pd.category as persona_category
            FROM flowmaestro.persona_instances pi
            JOIN flowmaestro.persona_definitions pd ON pi.persona_definition_id = pd.id
            WHERE pi.user_id = $1
                AND pi.workspace_id = $2
                AND pi.deleted_at IS NULL
                AND pi.status IN ('waiting_approval', 'completed')
                AND (
                    pi.status = 'waiting_approval'
                    OR (pi.status = 'completed' AND pi.completed_at > NOW() - INTERVAL '24 hours')
                )
            ORDER BY
                CASE WHEN pi.status = 'waiting_approval' THEN 0 ELSE 1 END,
                pi.updated_at DESC
            LIMIT 10
        `;

        // Query for running instances
        const runningQuery = `
            SELECT
                pi.*,
                pd.name as persona_name,
                pd.slug as persona_slug,
                pd.title as persona_title,
                pd.avatar_url as persona_avatar_url,
                pd.category as persona_category
            FROM flowmaestro.persona_instances pi
            JOIN flowmaestro.persona_definitions pd ON pi.persona_definition_id = pd.id
            WHERE pi.user_id = $1
                AND pi.workspace_id = $2
                AND pi.deleted_at IS NULL
                AND pi.status IN ('initializing', 'clarifying', 'running')
            ORDER BY pi.started_at DESC
            LIMIT 10
        `;

        // Query for recently completed instances (excluding those in needs_attention)
        const recentCompletedQuery = `
            SELECT
                pi.*,
                pd.name as persona_name,
                pd.slug as persona_slug,
                pd.title as persona_title,
                pd.avatar_url as persona_avatar_url,
                pd.category as persona_category
            FROM flowmaestro.persona_instances pi
            JOIN flowmaestro.persona_definitions pd ON pi.persona_definition_id = pd.id
            WHERE pi.user_id = $1
                AND pi.workspace_id = $2
                AND pi.deleted_at IS NULL
                AND pi.status IN ('completed', 'cancelled', 'failed', 'timeout')
                AND pi.completed_at <= NOW() - INTERVAL '24 hours'
            ORDER BY pi.completed_at DESC
            LIMIT 10
        `;

        const [needsAttentionResult, runningResult, recentCompletedResult] = await Promise.all([
            db.query(needsAttentionQuery, [userId, workspaceId]),
            db.query(runningQuery, [userId, workspaceId]),
            db.query(recentCompletedQuery, [userId, workspaceId])
        ]);

        return {
            needs_attention: needsAttentionResult.rows.map((row) =>
                this.mapSummaryRow(row as PersonaInstanceSummaryRow)
            ),
            running: runningResult.rows.map((row) =>
                this.mapSummaryRow(row as PersonaInstanceSummaryRow)
            ),
            recent_completed: recentCompletedResult.rows.map((row) =>
                this.mapSummaryRow(row as PersonaInstanceSummaryRow)
            )
        };
    }

    /**
     * Count active instances for a user (for badge display)
     */
    async countNeedsAttention(userId: string, workspaceId: string): Promise<number> {
        const query = `
            SELECT COUNT(*) as count
            FROM flowmaestro.persona_instances
            WHERE user_id = $1
                AND workspace_id = $2
                AND deleted_at IS NULL
                AND status IN ('waiting_approval', 'completed')
                AND (
                    status = 'waiting_approval'
                    OR (status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours')
                )
        `;

        const result = await db.query<{ count: string }>(query, [userId, workspaceId]);
        return parseInt(result.rows[0].count);
    }

    /**
     * Update a persona instance
     */
    async update(
        id: string,
        input: UpdatePersonaInstanceInput
    ): Promise<PersonaInstanceModel | null> {
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (input.task_title !== undefined) {
            updates.push(`task_title = $${paramIndex++}`);
            values.push(input.task_title);
        }

        if (input.task_description !== undefined) {
            updates.push(`task_description = $${paramIndex++}`);
            values.push(input.task_description);
        }

        if (input.additional_context !== undefined) {
            updates.push(`additional_context = $${paramIndex++}`);
            values.push(JSON.stringify(input.additional_context));
        }

        if (input.structured_inputs !== undefined) {
            updates.push(`structured_inputs = $${paramIndex++}`);
            values.push(JSON.stringify(input.structured_inputs));
        }

        if (input.thread_id !== undefined) {
            updates.push(`thread_id = $${paramIndex++}`);
            values.push(input.thread_id);
        }

        if (input.execution_id !== undefined) {
            updates.push(`execution_id = $${paramIndex++}`);
            values.push(input.execution_id);
        }

        if (input.status !== undefined) {
            updates.push(`status = $${paramIndex++}`);
            values.push(input.status);
        }

        if (input.max_duration_hours !== undefined) {
            updates.push(`max_duration_hours = $${paramIndex++}`);
            values.push(input.max_duration_hours);
        }

        if (input.max_cost_credits !== undefined) {
            updates.push(`max_cost_credits = $${paramIndex++}`);
            values.push(input.max_cost_credits);
        }

        if (input.progress !== undefined) {
            updates.push(`progress = $${paramIndex++}`);
            values.push(JSON.stringify(input.progress));
        }

        if (input.started_at !== undefined) {
            updates.push(`started_at = $${paramIndex++}`);
            values.push(input.started_at);
        }

        if (input.completed_at !== undefined) {
            updates.push(`completed_at = $${paramIndex++}`);
            values.push(input.completed_at);
        }

        if (input.duration_seconds !== undefined) {
            updates.push(`duration_seconds = $${paramIndex++}`);
            values.push(input.duration_seconds);
        }

        if (input.accumulated_cost_credits !== undefined) {
            updates.push(`accumulated_cost_credits = $${paramIndex++}`);
            values.push(input.accumulated_cost_credits);
        }

        if (input.iteration_count !== undefined) {
            updates.push(`iteration_count = $${paramIndex++}`);
            values.push(input.iteration_count);
        }

        if (input.completion_reason !== undefined) {
            updates.push(`completion_reason = $${paramIndex++}`);
            values.push(input.completion_reason);
        }

        if (input.notification_config !== undefined) {
            updates.push(`notification_config = $${paramIndex++}`);
            values.push(JSON.stringify(input.notification_config));
        }

        if (input.sandbox_id !== undefined) {
            updates.push(`sandbox_id = $${paramIndex++}`);
            values.push(input.sandbox_id);
        }

        if (input.sandbox_state !== undefined) {
            updates.push(`sandbox_state = $${paramIndex++}`);
            values.push(input.sandbox_state);
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.persona_instances
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaInstanceRow) : null;
    }

    /**
     * Update status of a persona instance
     */
    async updateStatus(
        id: string,
        status: PersonaInstanceStatus,
        completionReason?: PersonaInstanceCompletionReason
    ): Promise<PersonaInstanceModel | null> {
        const updates: string[] = ["status = $1"];
        const values: unknown[] = [status];
        let paramIndex = 2;

        // Set started_at if transitioning to running
        if (status === "running") {
            updates.push("started_at = COALESCE(started_at, NOW())");
        }

        // Set completed_at and duration if completing
        if (["completed", "cancelled", "failed", "timeout"].includes(status)) {
            updates.push("completed_at = NOW()");
            updates.push(
                "duration_seconds = EXTRACT(EPOCH FROM (NOW() - COALESCE(started_at, created_at)))::INTEGER"
            );

            if (completionReason) {
                updates.push(`completion_reason = $${paramIndex++}`);
                values.push(completionReason);
            }
        }

        values.push(id);
        const query = `
            UPDATE flowmaestro.persona_instances
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, values);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaInstanceRow) : null;
    }

    /**
     * Increment cost and iteration count
     */
    async incrementProgress(
        id: string,
        costIncrement: number,
        iterationIncrement: number = 1
    ): Promise<PersonaInstanceModel | null> {
        const query = `
            UPDATE flowmaestro.persona_instances
            SET
                accumulated_cost_credits = accumulated_cost_credits + $1,
                iteration_count = iteration_count + $2
            WHERE id = $3 AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [costIncrement, iterationIncrement, id]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0] as PersonaInstanceRow) : null;
    }

    /**
     * Soft delete a persona instance
     */
    async delete(id: string): Promise<boolean> {
        const query = `
            UPDATE flowmaestro.persona_instances
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Hard delete a persona instance (for test cleanup)
     */
    async hardDelete(id: string): Promise<boolean> {
        const query = `
            DELETE FROM flowmaestro.persona_instances
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);
        return (result.rowCount || 0) > 0;
    }

    /**
     * Map database row to model
     */
    private mapRow(row: PersonaInstanceRow): PersonaInstanceModel {
        return {
            id: row.id,
            persona_definition_id: row.persona_definition_id,
            user_id: row.user_id,
            workspace_id: row.workspace_id,
            task_title: row.task_title,
            task_description: row.task_description,
            additional_context:
                typeof row.additional_context === "string"
                    ? JSON.parse(row.additional_context)
                    : row.additional_context,
            structured_inputs:
                typeof row.structured_inputs === "string"
                    ? JSON.parse(row.structured_inputs)
                    : row.structured_inputs,
            thread_id: row.thread_id,
            execution_id: row.execution_id,
            status: row.status as PersonaInstanceStatus,
            max_duration_hours:
                row.max_duration_hours !== null
                    ? typeof row.max_duration_hours === "string"
                        ? parseFloat(row.max_duration_hours)
                        : row.max_duration_hours
                    : null,
            max_cost_credits:
                row.max_cost_credits !== null
                    ? typeof row.max_cost_credits === "string"
                        ? parseInt(row.max_cost_credits)
                        : row.max_cost_credits
                    : null,
            progress:
                row.progress !== null
                    ? typeof row.progress === "string"
                        ? JSON.parse(row.progress)
                        : row.progress
                    : null,
            started_at: row.started_at ? new Date(row.started_at) : null,
            completed_at: row.completed_at ? new Date(row.completed_at) : null,
            duration_seconds:
                row.duration_seconds !== null
                    ? typeof row.duration_seconds === "string"
                        ? parseInt(row.duration_seconds)
                        : row.duration_seconds
                    : null,
            accumulated_cost_credits:
                typeof row.accumulated_cost_credits === "string"
                    ? parseFloat(row.accumulated_cost_credits)
                    : row.accumulated_cost_credits,
            iteration_count:
                typeof row.iteration_count === "string"
                    ? parseInt(row.iteration_count)
                    : row.iteration_count,
            completion_reason: row.completion_reason as PersonaInstanceCompletionReason | null,
            notification_config:
                typeof row.notification_config === "string"
                    ? JSON.parse(row.notification_config)
                    : row.notification_config,
            sandbox_id: row.sandbox_id,
            sandbox_state: row.sandbox_state as SandboxState | null,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
            deleted_at: row.deleted_at ? new Date(row.deleted_at) : null
        };
    }

    /**
     * Map database row with persona join to summary
     */
    private mapSummaryRow(row: PersonaInstanceSummaryRow): PersonaInstanceSummary {
        return {
            id: row.id,
            persona_definition_id: row.persona_definition_id,
            task_title: row.task_title,
            task_description: row.task_description,
            status: row.status as PersonaInstanceStatus,
            progress:
                row.progress !== null
                    ? typeof row.progress === "string"
                        ? JSON.parse(row.progress)
                        : row.progress
                    : null,
            started_at: row.started_at ? new Date(row.started_at) : null,
            completed_at: row.completed_at ? new Date(row.completed_at) : null,
            duration_seconds:
                row.duration_seconds !== null
                    ? typeof row.duration_seconds === "string"
                        ? parseInt(row.duration_seconds)
                        : row.duration_seconds
                    : null,
            accumulated_cost_credits:
                typeof row.accumulated_cost_credits === "string"
                    ? parseFloat(row.accumulated_cost_credits)
                    : row.accumulated_cost_credits,
            iteration_count:
                typeof row.iteration_count === "string"
                    ? parseInt(row.iteration_count)
                    : row.iteration_count,
            updated_at: new Date(row.updated_at),
            persona: row.persona_name
                ? {
                      name: row.persona_name,
                      slug: row.persona_slug,
                      title: row.persona_title,
                      avatar_url: row.persona_avatar_url,
                      category: row.persona_category as PersonaCategory
                  }
                : null
        };
    }
}
