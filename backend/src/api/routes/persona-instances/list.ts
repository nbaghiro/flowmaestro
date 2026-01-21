import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import type { PersonaInstanceStatus } from "../../../storage/models/PersonaInstance";

interface ListPersonaInstancesQuery {
    status?: string;
    persona_definition_id?: string;
    limit?: string;
    offset?: string;
}

export async function listPersonaInstancesHandler(
    request: FastifyRequest<{ Querystring: ListPersonaInstancesQuery }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;
    const query = request.query;

    const repo = new PersonaInstanceRepository();

    // Parse status (can be comma-separated for multiple statuses)
    let statusFilter: PersonaInstanceStatus | PersonaInstanceStatus[] | undefined;
    if (query.status) {
        const statuses = query.status.split(",") as PersonaInstanceStatus[];
        statusFilter = statuses.length === 1 ? statuses[0] : statuses;
    }

    const result = await repo.findByUserId(userId, workspaceId, {
        status: statusFilter,
        persona_definition_id: query.persona_definition_id,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0
    });

    reply.send({
        success: true,
        data: result
    });
}
