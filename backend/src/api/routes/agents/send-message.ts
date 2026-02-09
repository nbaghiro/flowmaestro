import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { getTemporalClient } from "../../../temporal/client";
import { userMessageSignal } from "../../../temporal/workflows/agent-orchestrator";
import { NotFoundError, BadRequestError } from "../../middleware";

const sendMessageParamsSchema = z.object({
    id: z.string().uuid(), // agent ID
    executionId: z.string().uuid()
});

const sendMessageSchema = z.object({
    message: z.string().min(1)
});

export async function sendMessageHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { executionId } = sendMessageParamsSchema.parse(request.params);
    const { message } = sendMessageSchema.parse(request.body);

    const executionRepo = new AgentExecutionRepository();

    // Check if execution exists and belongs to workspace
    const execution = await executionRepo.findByIdAndWorkspaceId(executionId, workspaceId);
    if (!execution) {
        throw new NotFoundError("Agent execution not found");
    }

    // Check if execution is still running
    if (execution.status !== "running") {
        throw new BadRequestError(
            `Cannot send message to execution with status: ${execution.status}`
        );
    }

    try {
        // Send signal to Temporal workflow
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(executionId);

        await handle.signal(userMessageSignal, message);

        reply.send({
            success: true,
            message: "Message sent successfully"
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to send message"
        );
    }
}
