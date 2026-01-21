import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaDefinitionRepository } from "../../../storage/repositories/PersonaDefinitionRepository";
import type { PersonaCategory, PersonaStatus } from "../../../storage/models/PersonaDefinition";

interface ListPersonasQuery {
    category?: PersonaCategory;
    featured?: string;
    status?: PersonaStatus;
    search?: string;
    limit?: string;
    offset?: string;
}

export async function listPersonasHandler(
    request: FastifyRequest<{ Querystring: ListPersonasQuery }>,
    reply: FastifyReply
): Promise<void> {
    const repo = new PersonaDefinitionRepository();
    const query = request.query;

    const result = await repo.findAll({
        category: query.category,
        featured: query.featured === "true" ? true : query.featured === "false" ? false : undefined,
        status: query.status,
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0
    });

    reply.send({
        success: true,
        data: result
    });
}
