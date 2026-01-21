import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { BadRequestError, NotFoundError } from "../../middleware";

interface DeletePersonaInstanceParams {
    id: string;
}

export async function deletePersonaInstanceHandler(
    request: FastifyRequest<{ Params: DeletePersonaInstanceParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Can only delete instances that are not actively running
    const activeStates = ["running", "clarifying"];
    if (activeStates.includes(instance.status)) {
        throw new BadRequestError(
            `Cannot delete instance in "${instance.status}" state. ` +
                "Cancel it first before deleting."
        );
    }

    // Soft delete
    const deleted = await instanceRepo.delete(id);

    if (!deleted) {
        throw new BadRequestError("Failed to delete instance");
    }

    reply.code(204).send();
}
