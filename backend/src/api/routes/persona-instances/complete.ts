import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { BadRequestError, NotFoundError } from "../../middleware";

interface CompletePersonaInstanceParams {
    id: string;
}

export async function completePersonaInstanceHandler(
    request: FastifyRequest<{ Params: CompletePersonaInstanceParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // User can mark as complete only if instance has finished (completed, failed, timeout)
    // This is for user acknowledgment of deliverables
    const completableStates = ["completed", "failed", "timeout"];
    if (!completableStates.includes(instance.status)) {
        throw new BadRequestError(
            `Cannot mark instance as user-completed in "${instance.status}" state. ` +
                "Wait for the instance to finish first."
        );
    }

    // Update completion reason to indicate user reviewed
    const updated = await instanceRepo.update(id, {
        completion_reason: "user_completed"
    });

    reply.send({
        success: true,
        data: updated
    });
}
