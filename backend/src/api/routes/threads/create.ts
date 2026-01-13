import { FastifyRequest, FastifyReply } from "fastify";
import type { JsonObject } from "@flowmaestro/shared";
import { ThreadStatus } from "../../../storage/models/Thread";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";

interface CreateThreadBody {
    agent_id: string;
    title?: string;
    status?: ThreadStatus;
    metadata?: JsonObject;
}

export async function createThreadHandler(
    request: FastifyRequest<{ Body: CreateThreadBody }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const workspaceId = request.workspace!.id;
    const { agent_id, title, status, metadata } = request.body;

    // Validate agent exists and workspace has access
    const agentRepo = new AgentRepository();
    const agent = await agentRepo.findByIdAndWorkspaceId(agent_id, workspaceId);

    if (!agent) {
        return reply.code(404).send({
            success: false,
            error: "Agent not found"
        });
    }

    // Create thread
    const threadRepo = new ThreadRepository();
    const thread = await threadRepo.create({
        user_id: userId,
        workspace_id: workspaceId,
        agent_id,
        title,
        status,
        metadata
    });

    reply.code(201).send({
        success: true,
        data: thread
    });
}
