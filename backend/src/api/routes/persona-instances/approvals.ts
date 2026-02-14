/**
 * Persona Instance Approvals API
 *
 * Endpoints for managing persona approval requests.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { PersonaApprovalSignalPayload } from "@flowmaestro/shared";
import { PersonaApprovalRequestRepository } from "../../../storage/repositories/PersonaApprovalRequestRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { getTemporalClient } from "../../../temporal/client";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { BadRequestError, NotFoundError } from "../../middleware";
import { createRequestLogger } from "../../../core/logging";

// =============================================================================
// Types
// =============================================================================

interface ApprovalRequestParams {
    id: string; // persona instance id
    approvalId: string;
}

interface InstanceParams {
    id: string;
}

const approvalActionSchema = z.object({
    note: z.string().optional()
});

interface ApprovalActionBody {
    note?: string;
}

// =============================================================================
// Get pending approvals for an instance
// =============================================================================

export async function getInstanceApprovalsHandler(
    request: FastifyRequest<{ Params: InstanceParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    const approvalRepo = new PersonaApprovalRequestRepository();
    const approvals = await approvalRepo.findByInstanceId(id);

    reply.send({
        success: true,
        data: {
            approvals: approvals.map((a) => ({
                id: a.id,
                instance_id: a.instance_id,
                action_type: a.action_type,
                tool_name: a.tool_name,
                action_description: a.action_description,
                action_arguments: a.action_arguments,
                risk_level: a.risk_level,
                estimated_cost_credits: a.estimated_cost_credits,
                agent_context: a.agent_context,
                alternatives: a.alternatives,
                status: a.status,
                responded_by: a.responded_by,
                responded_at: a.responded_at?.toISOString() || null,
                response_note: a.response_note,
                created_at: a.created_at.toISOString()
            }))
        }
    });
}

// =============================================================================
// Approve an action
// =============================================================================

export async function approveActionHandler(
    request: FastifyRequest<{ Params: ApprovalRequestParams; Body: ApprovalActionBody }>,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;
    const { id, approvalId } = request.params;
    const { note } = request.body || {};

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    const approvalRepo = new PersonaApprovalRequestRepository();
    const approval = await approvalRepo.findById(approvalId);

    if (!approval) {
        throw new NotFoundError("Approval request not found");
    }

    if (approval.instance_id !== id) {
        throw new NotFoundError("Approval request not found");
    }

    if (approval.status !== "pending") {
        throw new BadRequestError(`Approval request is already ${approval.status}`);
    }

    // Update approval record
    const respondedAt = new Date();
    const updated = await approvalRepo.update(approvalId, {
        status: "approved",
        responded_by: userId,
        responded_at: respondedAt,
        response_note: note
    });

    // Clear pending approval from instance and set status back to running
    await instanceRepo.update(id, {
        status: "running",
        pending_approval_id: null
    });

    // Signal the Temporal workflow
    if (instance.execution_id) {
        try {
            const client = await getTemporalClient();
            const handle = client.workflow.getHandle(instance.execution_id);

            const signalPayload: PersonaApprovalSignalPayload = {
                approval_id: approvalId,
                decision: "approved",
                note: note,
                responded_at: respondedAt.getTime()
            };

            await handle.signal("personaApprovalResponse", signalPayload);

            logger.info(
                { executionId: instance.execution_id, approvalId, decision: "approved" },
                "Sent approval signal to workflow"
            );
        } catch (signalError) {
            logger.warn(
                { error: signalError, executionId: instance.execution_id },
                "Could not signal workflow - workflow may have completed"
            );
        }
    }

    // Emit WebSocket event
    await redisEventBus.publishJson(`persona:${id}:events`, {
        type: "persona:instance:approval_resolved",
        timestamp: Date.now(),
        instanceId: id,
        approval_id: approvalId,
        decision: "approved"
    });

    reply.send({
        success: true,
        data: {
            id: updated!.id,
            status: updated!.status,
            responded_at: updated!.responded_at?.toISOString()
        }
    });
}

// =============================================================================
// Deny an action
// =============================================================================

export async function denyActionHandler(
    request: FastifyRequest<{ Params: ApprovalRequestParams; Body: ApprovalActionBody }>,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const workspaceId = request.workspace!.id;
    const userId = request.user!.id;
    const { id, approvalId } = request.params;
    const { note } = request.body || {};

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    const approvalRepo = new PersonaApprovalRequestRepository();
    const approval = await approvalRepo.findById(approvalId);

    if (!approval) {
        throw new NotFoundError("Approval request not found");
    }

    if (approval.instance_id !== id) {
        throw new NotFoundError("Approval request not found");
    }

    if (approval.status !== "pending") {
        throw new BadRequestError(`Approval request is already ${approval.status}`);
    }

    // Update approval record
    const respondedAt = new Date();
    const updated = await approvalRepo.update(approvalId, {
        status: "denied",
        responded_by: userId,
        responded_at: respondedAt,
        response_note: note
    });

    // Clear pending approval from instance and set status back to running
    // (workflow will continue without executing the denied tool)
    await instanceRepo.update(id, {
        status: "running",
        pending_approval_id: null
    });

    // Signal the Temporal workflow
    if (instance.execution_id) {
        try {
            const client = await getTemporalClient();
            const handle = client.workflow.getHandle(instance.execution_id);

            const signalPayload: PersonaApprovalSignalPayload = {
                approval_id: approvalId,
                decision: "denied",
                note: note,
                responded_at: respondedAt.getTime()
            };

            await handle.signal("personaApprovalResponse", signalPayload);

            logger.info(
                { executionId: instance.execution_id, approvalId, decision: "denied" },
                "Sent denial signal to workflow"
            );
        } catch (signalError) {
            logger.warn(
                { error: signalError, executionId: instance.execution_id },
                "Could not signal workflow - workflow may have completed"
            );
        }
    }

    // Emit WebSocket event
    await redisEventBus.publishJson(`persona:${id}:events`, {
        type: "persona:instance:approval_resolved",
        timestamp: Date.now(),
        instanceId: id,
        approval_id: approvalId,
        decision: "denied"
    });

    reply.send({
        success: true,
        data: {
            id: updated!.id,
            status: updated!.status,
            responded_at: updated!.responded_at?.toISOString()
        }
    });
}

// =============================================================================
// Get pending approval count for workspace (for badge)
// =============================================================================

export async function getPendingApprovalCountHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;

    const approvalRepo = new PersonaApprovalRequestRepository();
    const count = await approvalRepo.countPendingByWorkspaceId(workspaceId);

    reply.send({
        success: true,
        data: { count }
    });
}

// =============================================================================
// Get all pending approvals for workspace
// =============================================================================

interface ListApprovalsQuery {
    limit?: string;
    offset?: string;
}

export async function listPendingApprovalsHandler(
    request: FastifyRequest<{ Querystring: ListApprovalsQuery }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const limit = request.query.limit ? parseInt(request.query.limit) : 50;
    const offset = request.query.offset ? parseInt(request.query.offset) : 0;

    const approvalRepo = new PersonaApprovalRequestRepository();
    const approvals = await approvalRepo.findPendingByWorkspaceId(workspaceId, { limit, offset });

    reply.send({
        success: true,
        data: {
            approvals: approvals.map((a) => ({
                id: a.id,
                instance_id: a.instance_id,
                action_type: a.action_type,
                tool_name: a.tool_name,
                action_description: a.action_description,
                risk_level: a.risk_level,
                estimated_cost_credits: a.estimated_cost_credits,
                status: a.status,
                created_at: a.created_at.toISOString(),
                waiting_seconds: a.waiting_seconds
            }))
        }
    });
}

// Export schema for validation
export { approvalActionSchema };
