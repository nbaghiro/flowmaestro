/**
 * Persona Instance Deliverables API Routes
 *
 * Endpoints for listing and downloading deliverables from persona instances.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { PersonaInstanceDeliverableRepository } from "../../../storage/repositories/PersonaInstanceDeliverableRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { NotFoundError, ForbiddenError } from "../../middleware";

const logger = createServiceLogger("PersonaInstanceDeliverables");

/**
 * List all deliverables for a persona instance
 */
export async function listDeliverables(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const instanceId = request.params.id;

    // Verify instance exists and user has access
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findById(instanceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    if (instance.user_id !== userId) {
        throw new ForbiddenError("You don't have access to this instance");
    }

    // Get deliverable summaries
    const deliverableRepo = new PersonaInstanceDeliverableRepository();
    const deliverables = await deliverableRepo.getSummariesByInstanceId(instanceId);

    reply.send({
        success: true,
        data: deliverables
    });
}

/**
 * Get a specific deliverable with its content
 */
export async function getDeliverable(
    request: FastifyRequest<{ Params: { id: string; deliverableId: string } }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const instanceId = request.params.id;
    const deliverableId = request.params.deliverableId;

    // Verify instance exists and user has access
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findById(instanceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    if (instance.user_id !== userId) {
        throw new ForbiddenError("You don't have access to this instance");
    }

    // Get full deliverable
    const deliverableRepo = new PersonaInstanceDeliverableRepository();
    const deliverable = await deliverableRepo.findById(deliverableId);

    if (!deliverable) {
        throw new NotFoundError("Deliverable not found");
    }

    if (deliverable.instance_id !== instanceId) {
        throw new ForbiddenError("Deliverable does not belong to this instance");
    }

    reply.send({
        success: true,
        data: {
            id: deliverable.id,
            name: deliverable.name,
            description: deliverable.description,
            type: deliverable.type,
            content: deliverable.content,
            file_url: deliverable.file_url,
            file_size_bytes: deliverable.file_size_bytes,
            file_extension: deliverable.file_extension,
            created_at: deliverable.created_at.toISOString()
        }
    });
}

/**
 * Download a deliverable as a file
 */
export async function downloadDeliverable(
    request: FastifyRequest<{ Params: { id: string; deliverableId: string } }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const instanceId = request.params.id;
    const deliverableId = request.params.deliverableId;

    // Verify instance exists and user has access
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findById(instanceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    if (instance.user_id !== userId) {
        throw new ForbiddenError("You don't have access to this instance");
    }

    // Get deliverable
    const deliverableRepo = new PersonaInstanceDeliverableRepository();
    const deliverable = await deliverableRepo.findById(deliverableId);

    if (!deliverable) {
        throw new NotFoundError("Deliverable not found");
    }

    if (deliverable.instance_id !== instanceId) {
        throw new ForbiddenError("Deliverable does not belong to this instance");
    }

    // Determine content type
    const contentTypes: Record<string, string> = {
        markdown: "text/markdown",
        csv: "text/csv",
        json: "application/json",
        pdf: "application/pdf",
        code: "text/plain",
        image: "image/png",
        html: "text/html"
    };

    const contentType = contentTypes[deliverable.type] || "application/octet-stream";
    const filename = `${deliverable.name}.${deliverable.file_extension || "txt"}`;

    // If content is stored directly
    if (deliverable.content) {
        reply
            .header("Content-Type", contentType)
            .header("Content-Disposition", `attachment; filename="${filename}"`)
            .send(deliverable.content);
        return;
    }

    // If content is in external storage (file_url)
    if (deliverable.file_url) {
        // Redirect to the file URL
        reply.redirect(deliverable.file_url);
        return;
    }

    throw new NotFoundError("Deliverable content not available");
}

/**
 * Delete a deliverable
 */
export async function deleteDeliverable(
    request: FastifyRequest<{ Params: { id: string; deliverableId: string } }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const instanceId = request.params.id;
    const deliverableId = request.params.deliverableId;

    // Verify instance exists and user has access
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findById(instanceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    if (instance.user_id !== userId) {
        throw new ForbiddenError("You don't have access to this instance");
    }

    // Delete deliverable
    const deliverableRepo = new PersonaInstanceDeliverableRepository();
    const deleted = await deliverableRepo.delete(deliverableId);

    if (!deleted) {
        throw new NotFoundError("Deliverable not found");
    }

    logger.info({ deliverableId, instanceId, userId }, "Deliverable deleted");

    reply.send({
        success: true,
        message: "Deliverable deleted"
    });
}
