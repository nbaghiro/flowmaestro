/**
 * Extend Approval Expiration Endpoint
 *
 * POST /persona-instances/:id/approvals/:approvalId/extend
 *
 * Extends the expiration time of a pending approval request.
 */

import { z } from "zod";
import { createRequestLogger } from "../../../core/logging";
import { PersonaApprovalRequestRepository } from "../../../storage/repositories/PersonaApprovalRequestRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { NotFoundError, BadRequestError } from "../../middleware";
import type { FastifyRequest, FastifyReply } from "fastify";

const extendApprovalParamsSchema = z.object({
    id: z.string().uuid(),
    approvalId: z.string().uuid()
});

const extendApprovalBodySchema = z.object({
    // Extension duration in hours (default: 24 hours)
    hours: z.number().min(1).max(168).default(24) // Max 7 days
});

export async function extendApprovalHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const logger = createRequestLogger(request);
    const user = request.user;
    const workspaceId = request.headers["x-workspace-id"] as string;

    if (!user || !workspaceId) {
        throw new BadRequestError("User and workspace context required");
    }

    const params = extendApprovalParamsSchema.parse(request.params);
    const body = extendApprovalBodySchema.parse(request.body || {});

    logger.info(
        {
            instanceId: params.id,
            approvalId: params.approvalId,
            hours: body.hours
        },
        "Extending approval expiration"
    );

    // Verify instance exists and belongs to workspace
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(params.id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Verify approval exists and belongs to the instance
    const approvalRepo = new PersonaApprovalRequestRepository();
    const approval = await approvalRepo.findById(params.approvalId);

    if (!approval) {
        throw new NotFoundError("Approval request not found");
    }

    if (approval.instance_id !== params.id) {
        throw new NotFoundError("Approval request not found for this instance");
    }

    if (approval.status !== "pending") {
        throw new BadRequestError(`Cannot extend approval that is already ${approval.status}`);
    }

    // Calculate new expiration time
    const currentExpiration = approval.expires_at || new Date();
    const newExpiration = new Date(currentExpiration.getTime() + body.hours * 60 * 60 * 1000);

    // Extend the expiration
    const updatedApproval = await approvalRepo.extendExpiration(params.approvalId, newExpiration);

    if (!updatedApproval) {
        throw new BadRequestError("Failed to extend approval - it may have already been resolved");
    }

    logger.info(
        {
            approvalId: params.approvalId,
            oldExpiration: currentExpiration.toISOString(),
            newExpiration: newExpiration.toISOString()
        },
        "Approval expiration extended"
    );

    reply.code(200).send({
        success: true,
        data: {
            id: updatedApproval.id,
            instance_id: updatedApproval.instance_id,
            expires_at: updatedApproval.expires_at?.toISOString(),
            extended_by_hours: body.hours
        }
    });
}
