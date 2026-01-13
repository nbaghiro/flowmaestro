import { FastifyRequest, FastifyReply } from "fastify";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";

interface GetThreadParams {
    id: string;
}

interface GetThreadQuery {
    include_stats?: string;
}

export async function getThreadHandler(
    request: FastifyRequest<{ Params: GetThreadParams; Querystring: GetThreadQuery }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;
    const { include_stats } = request.query;

    const threadRepo = new ThreadRepository();
    const thread = await threadRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!thread) {
        return reply.code(404).send({
            success: false,
            error: "Thread not found"
        });
    }

    // Optionally include stats
    let stats;
    if (include_stats === "true") {
        stats = await threadRepo.getStats(id);
    }

    reply.send({
        success: true,
        data: {
            ...thread,
            ...(stats && { stats })
        }
    });
}
