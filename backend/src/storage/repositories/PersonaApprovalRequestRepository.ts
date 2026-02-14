/**
 * Persona Approval Request Repository
 *
 * Handles database operations for persona approval requests.
 */

import { db } from "../database";
import type {
    PersonaApprovalRequestRow,
    PersonaApprovalRequestModel,
    PersonaApprovalRequestSummary,
    CreateApprovalRequestInput,
    UpdateApprovalRequestInput
} from "../models/PersonaApprovalRequest";

/**
 * Map database row to model
 */
function mapRow(row: PersonaApprovalRequestRow): PersonaApprovalRequestModel {
    return {
        id: row.id,
        instance_id: row.instance_id,
        action_type: row.action_type,
        tool_name: row.tool_name,
        action_description: row.action_description,
        action_arguments: row.action_arguments,
        risk_level: row.risk_level,
        estimated_cost_credits: row.estimated_cost_credits
            ? parseFloat(row.estimated_cost_credits)
            : null,
        agent_context: row.agent_context,
        alternatives: row.alternatives,
        status: row.status,
        responded_by: row.responded_by,
        responded_at: row.responded_at,
        response_note: row.response_note,
        created_at: row.created_at,
        expires_at: row.expires_at
    };
}

/**
 * Map row to summary with computed waiting_seconds
 */
function mapToSummary(row: PersonaApprovalRequestRow): PersonaApprovalRequestSummary {
    const waitingSeconds = Math.floor((Date.now() - row.created_at.getTime()) / 1000);

    return {
        id: row.id,
        instance_id: row.instance_id,
        action_type: row.action_type,
        tool_name: row.tool_name,
        action_description: row.action_description,
        risk_level: row.risk_level,
        estimated_cost_credits: row.estimated_cost_credits
            ? parseFloat(row.estimated_cost_credits)
            : null,
        status: row.status,
        created_at: row.created_at,
        waiting_seconds: waitingSeconds
    };
}

export class PersonaApprovalRequestRepository {
    /**
     * Create a new approval request
     */
    async create(input: CreateApprovalRequestInput): Promise<PersonaApprovalRequestModel> {
        const result = await db.query<PersonaApprovalRequestRow>(
            `INSERT INTO flowmaestro.persona_approval_requests
             (instance_id, action_type, tool_name, action_description, action_arguments,
              risk_level, estimated_cost_credits, agent_context, alternatives, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                input.instance_id,
                input.action_type,
                input.tool_name || null,
                input.action_description,
                JSON.stringify(input.action_arguments),
                input.risk_level,
                input.estimated_cost_credits ?? null,
                input.agent_context || null,
                input.alternatives || null,
                input.expires_at || null
            ]
        );

        return mapRow(result.rows[0]);
    }

    /**
     * Find an approval request by ID
     */
    async findById(id: string): Promise<PersonaApprovalRequestModel | null> {
        const result = await db.query<PersonaApprovalRequestRow>(
            "SELECT * FROM flowmaestro.persona_approval_requests WHERE id = $1",
            [id]
        );

        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }

    /**
     * Find the pending approval for an instance (there should be at most one)
     */
    async findPendingByInstanceId(instanceId: string): Promise<PersonaApprovalRequestModel | null> {
        const result = await db.query<PersonaApprovalRequestRow>(
            `SELECT * FROM flowmaestro.persona_approval_requests
             WHERE instance_id = $1 AND status = 'pending'
             ORDER BY created_at DESC
             LIMIT 1`,
            [instanceId]
        );

        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }

    /**
     * Find all approval requests for an instance
     */
    async findByInstanceId(instanceId: string): Promise<PersonaApprovalRequestModel[]> {
        const result = await db.query<PersonaApprovalRequestRow>(
            `SELECT * FROM flowmaestro.persona_approval_requests
             WHERE instance_id = $1
             ORDER BY created_at DESC`,
            [instanceId]
        );

        return result.rows.map(mapRow);
    }

    /**
     * Find all pending approvals for a workspace (via join with persona_instances)
     */
    async findPendingByWorkspaceId(
        workspaceId: string,
        options?: { limit?: number; offset?: number }
    ): Promise<PersonaApprovalRequestSummary[]> {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;

        const result = await db.query<PersonaApprovalRequestRow>(
            `SELECT par.*
             FROM flowmaestro.persona_approval_requests par
             JOIN flowmaestro.persona_instances pi ON par.instance_id = pi.id
             WHERE pi.workspace_id = $1 AND par.status = 'pending'
             ORDER BY par.created_at DESC
             LIMIT $2 OFFSET $3`,
            [workspaceId, limit, offset]
        );

        return result.rows.map(mapToSummary);
    }

    /**
     * Count pending approvals for a workspace
     */
    async countPendingByWorkspaceId(workspaceId: string): Promise<number> {
        const result = await db.query<{ count: string }>(
            `SELECT COUNT(*) as count
             FROM flowmaestro.persona_approval_requests par
             JOIN flowmaestro.persona_instances pi ON par.instance_id = pi.id
             WHERE pi.workspace_id = $1 AND par.status = 'pending'`,
            [workspaceId]
        );

        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Update an approval request (approve/deny)
     */
    async update(
        id: string,
        input: UpdateApprovalRequestInput
    ): Promise<PersonaApprovalRequestModel | null> {
        const result = await db.query<PersonaApprovalRequestRow>(
            `UPDATE flowmaestro.persona_approval_requests
             SET status = $2,
                 responded_by = $3,
                 responded_at = $4,
                 response_note = $5
             WHERE id = $1
             RETURNING *`,
            [
                id,
                input.status,
                input.responded_by || null,
                input.responded_at || null,
                input.response_note || null
            ]
        );

        return result.rows[0] ? mapRow(result.rows[0]) : null;
    }

    /**
     * Expire old pending approvals
     * Called by a cron job or when checking for expired approvals
     */
    async expirePendingBefore(beforeDate: Date): Promise<number> {
        const result = await db.query(
            `UPDATE flowmaestro.persona_approval_requests
             SET status = 'expired'
             WHERE status = 'pending'
             AND (expires_at IS NOT NULL AND expires_at < $1)`,
            [beforeDate]
        );

        return result.rowCount ?? 0;
    }

    /**
     * Cancel all pending approvals for an instance
     * Called when instance is cancelled
     */
    async cancelPendingByInstanceId(instanceId: string): Promise<number> {
        const result = await db.query(
            `UPDATE flowmaestro.persona_approval_requests
             SET status = 'expired'
             WHERE instance_id = $1 AND status = 'pending'`,
            [instanceId]
        );

        return result.rowCount ?? 0;
    }

    /**
     * Delete all approval requests for an instance
     * Used for test cleanup
     */
    async deleteByInstanceId(instanceId: string): Promise<number> {
        const result = await db.query(
            "DELETE FROM flowmaestro.persona_approval_requests WHERE instance_id = $1",
            [instanceId]
        );

        return result.rowCount ?? 0;
    }

    /**
     * Hard delete an approval request
     * Used for test cleanup
     */
    async hardDelete(id: string): Promise<boolean> {
        const result = await db.query(
            "DELETE FROM flowmaestro.persona_approval_requests WHERE id = $1",
            [id]
        );

        return (result.rowCount ?? 0) > 0;
    }
}
