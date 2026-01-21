import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { NotFoundError } from "../../middleware";

interface GetPersonaInstanceParams {
    id: string;
}

export async function getPersonaInstanceHandler(
    request: FastifyRequest<{ Params: GetPersonaInstanceParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Get persona definition for additional context
    const personaRepo = new PersonaDefinitionRepository();
    const persona = await personaRepo.findById(instance.persona_definition_id);

    reply.send({
        success: true,
        data: {
            ...instance,
            persona: persona
                ? {
                      name: persona.name,
                      slug: persona.slug,
                      avatar_url: persona.avatar_url,
                      category: persona.category
                  }
                : null
        }
    });
}
