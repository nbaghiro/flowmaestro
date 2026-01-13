import { FastifyRequest, FastifyReply } from "fastify";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";

interface ArchiveThreadParams {
    id: string;
}

export async function archiveThreadHandler(
    request: FastifyRequest<{ Params: ArchiveThreadParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const threadRepo = new ThreadRepository();

    // Verify thread exists and workspace has access
    const thread = await threadRepo.findByIdAndWorkspaceId(id, workspaceId);
    if (!thread) {
        return reply.code(404).send({
            success: false,
            error: "Thread not found"
        });
    }

    // Archive the thread
    const updated = await threadRepo.archive(id);

    reply.send({
        success: true,
        data: updated
    });
}

export async function unarchiveThreadHandler(
    request: FastifyRequest<{ Params: ArchiveThreadParams }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    const threadRepo = new ThreadRepository();

    // Verify thread exists and workspace has access
    const thread = await threadRepo.findByIdAndWorkspaceId(id, workspaceId);
    if (!thread) {
        return reply.code(404).send({
            success: false,
            error: "Thread not found"
        });
    }

    // Unarchive the thread
    const updated = await threadRepo.unarchive(id);

    reply.send({
        success: true,
        data: updated
    });
}
