import { FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { getTemporalClient } from "../../../temporal/client";
import { cancelPersonaSignal } from "../../../temporal/workflows/persona-orchestrator";
import { BadRequestError, NotFoundError } from "../../middleware";

const logger = createServiceLogger("PersonaInstanceCancel");

interface CancelPersonaInstanceParams {
    id: string;
}

export async function cancelPersonaInstanceHandler(
    request: FastifyRequest<{ Params: CancelPersonaInstanceParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Check if instance can be cancelled
    const cancellableStates = ["initializing", "clarifying", "running", "waiting_approval"];
    if (!cancellableStates.includes(instance.status)) {
        throw new BadRequestError(`Cannot cancel instance in "${instance.status}" state`);
    }

    // Cancel the Temporal workflow if it has an execution_id
    if (instance.execution_id) {
        try {
            const client = await getTemporalClient();
            const handle = client.workflow.getHandle(instance.execution_id);

            // First try to send a graceful cancellation signal
            try {
                await handle.signal(cancelPersonaSignal);
                logger.info(
                    { instanceId: id, executionId: instance.execution_id },
                    "Sent cancellation signal to persona workflow"
                );
            } catch (signalError) {
                logger.warn(
                    { err: signalError, instanceId: id },
                    "Failed to send cancellation signal, falling back to workflow cancel"
                );
            }

            // Also cancel the workflow to ensure it stops
            await handle.cancel();
            logger.info(
                { instanceId: id, executionId: instance.execution_id },
                "Cancelled persona workflow"
            );
        } catch (temporalError) {
            // Workflow may already be completed or not exist
            logger.warn(
                { err: temporalError, instanceId: id, executionId: instance.execution_id },
                "Failed to cancel Temporal workflow (may already be completed)"
            );
        }
    }

    // Update instance status
    const updated = await instanceRepo.updateStatus(id, "cancelled", "cancelled");

    logger.info({ instanceId: id }, "Persona instance cancelled");

    reply.send({
        success: true,
        data: updated
    });
}
