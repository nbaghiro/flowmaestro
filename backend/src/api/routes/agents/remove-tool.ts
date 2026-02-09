import { FastifyRequest, FastifyReply } from "fastify";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";

interface RemoveToolParams {
    id: string;
    toolId: string;
}

export async function removeToolHandler(
    request: FastifyRequest<{
        Params: RemoveToolParams;
    }>,
    reply: FastifyReply
): Promise<void> {
    const { id: agentId, toolId } = request.params;
    const workspaceId = request.workspace!.id;

    const agentRepo = new AgentRepository();

    // Get the agent
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);

    if (!agent) {
        reply.code(404).send({
            success: false,
            error: "Agent not found"
        });
        return;
    }

    // Find the tool to remove
    const toolIndex = agent.available_tools.findIndex((t) => t.id === toolId);

    if (toolIndex === -1) {
        reply.code(404).send({
            success: false,
            error: "Tool not found"
        });
        return;
    }

    // Remove the tool from the agent's available_tools array
    const updatedTools = agent.available_tools.filter((t) => t.id !== toolId);

    // Update the agent
    const updatedAgent = await agentRepo.update(agentId, {
        available_tools: updatedTools
    });

    if (!updatedAgent) {
        reply.code(500).send({
            success: false,
            error: "Failed to update agent"
        });
        return;
    }

    reply.code(200).send({
        success: true,
        data: {
            agent: updatedAgent
        }
    });
}
