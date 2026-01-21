import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import { NotFoundError } from "../../middleware";

interface GetPersonaParams {
    slug: string;
}

export async function getPersonaHandler(
    request: FastifyRequest<{ Params: GetPersonaParams }>,
    reply: FastifyReply
): Promise<void> {
    const repo = new PersonaDefinitionRepository();
    const { slug } = request.params;

    const persona = await repo.findBySlug(slug);

    if (!persona) {
        throw new NotFoundError("Persona not found");
    }

    reply.send({
        success: true,
        data: persona
    });
}
