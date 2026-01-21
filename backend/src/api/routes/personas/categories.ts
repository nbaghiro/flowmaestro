import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";

export async function getPersonasByCategoryHandler(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const repo = new PersonaDefinitionRepository();

    const groupedPersonas = await repo.findGroupedByCategory();

    reply.send({
        success: true,
        data: groupedPersonas
    });
}
