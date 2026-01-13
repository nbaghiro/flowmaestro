import { FastifyRequest, FastifyReply } from "fastify";
import { ThreadStatus } from "../../../storage/models/Thread";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";

interface ListThreadsQuery {
    agent_id?: string;
    status?: ThreadStatus;
    limit?: string;
    offset?: string;
    search?: string;
}

export async function listThreadsHandler(
    request: FastifyRequest<{ Querystring: ListThreadsQuery }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { agent_id, status, limit, offset, search } = request.query;

    const threadRepo = new ThreadRepository();

    const result = await threadRepo.list({
        workspace_id: workspaceId,
        agent_id,
        status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        search
    });

    reply.send({
        success: true,
        data: result
    });
}
