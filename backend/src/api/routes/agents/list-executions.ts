import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { AgentRepository } from "../../../storage/repositories/AgentRepository";
import { NotFoundError } from "../../middleware";

const listExecutionsParamsSchema = z.object({
    id: z.string().uuid()
});

const listExecutionsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    status: z.enum(["running", "completed", "failed", "cancelled"]).optional()
});

export async function listExecutionsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id: agentId } = listExecutionsParamsSchema.parse(request.params);
    const { limit, offset, status } = listExecutionsQuerySchema.parse(request.query);

    const agentRepo = new AgentRepository();
    const executionRepo = new AgentExecutionRepository();

    // Verify agent exists and belongs to workspace
    const agent = await agentRepo.findByIdAndWorkspaceId(agentId, workspaceId);
    if (!agent) {
        throw new NotFoundError("Agent not found");
    }

    // Get executions with pagination
    const { executions, total } = await executionRepo.findByAgentId(agentId, {
        limit,
        offset,
        status
    });

    // Format executions for response (exclude full thread history)
    const formattedExecutions = executions.map((execution) => ({
        id: execution.id,
        agentId: execution.agent_id,
        status: execution.status,
        iterations: execution.iterations,
        toolCallsCount: execution.tool_calls_count,
        firstMessagePreview:
            execution.thread_history.length > 0
                ? execution.thread_history[0].content.substring(0, 100)
                : null,
        messageCount: execution.thread_history.length,
        error: execution.error,
        startedAt: execution.started_at,
        completedAt: execution.completed_at
    }));

    reply.send({
        success: true,
        data: {
            executions: formattedExecutions,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        }
    });
}
