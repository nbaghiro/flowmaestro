import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { BadRequestError, NotFoundError } from "../../middleware";

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

    // Update instance status
    const updated = await instanceRepo.updateStatus(id, "cancelled", "cancelled");

    // TODO: In a full implementation, we would:
    // 1. Cancel any running agent execution
    // 2. Kill the sandbox if running
    // 3. Send cancellation notification
    // For now, we just update the status

    reply.send({
        success: true,
        data: updated
    });
}
