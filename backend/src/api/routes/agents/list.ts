import { FastifyRequest, FastifyReply } from "fastify";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";

export async function listAgentsHandler(
    request: FastifyRequest<{ Querystring: { folderId?: string } }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const agentRepo = new AgentRepository();

    // Parse folderId: "null" string means root level (no folder), undefined means all
    let folderId: string | null | undefined;
    if (request.query.folderId === "null") {
        folderId = null;
    } else if (request.query.folderId) {
        folderId = request.query.folderId;
    }

    const result = await agentRepo.findByWorkspaceId(workspaceId, { folderId });

    reply.send({
        success: true,
        data: result
    });
}
