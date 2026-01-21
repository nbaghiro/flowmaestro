import { FastifyRequest, FastifyReply } from "fastify";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";

export async function getPersonaInstancesDashboardHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;

    const repo = new PersonaInstanceRepository();
    const dashboard = await repo.getDashboard(userId, workspaceId);

    reply.send({
        success: true,
        data: dashboard
    });
}

export async function getPersonaInstancesCountHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;

    const repo = new PersonaInstanceRepository();
    const count = await repo.countNeedsAttention(userId, workspaceId);

    reply.send({
        success: true,
        data: { count }
    });
}
