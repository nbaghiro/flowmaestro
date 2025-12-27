import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { wait } from "@trigger.dev/sdk/v3";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { NotFoundError, BadRequestError } from "../../middleware";

const sendMessageParamsSchema = z.object({
    id: z.string().uuid(), // agent ID
    executionId: z.string().uuid()
});

const sendMessageSchema = z.object({
    message: z.string().min(1),
    waitpointId: z.string().optional()
});

export async function sendMessageHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { executionId } = sendMessageParamsSchema.parse(request.params);
    const { message, waitpointId } = sendMessageSchema.parse(request.body);

    const executionRepo = new AgentExecutionRepository();

    // Check if execution exists and belongs to user
    const execution = await executionRepo.findByIdAndUserId(executionId, userId);
    if (!execution) {
        throw new NotFoundError("Agent execution not found");
    }

    // Check if execution is still running or paused
    if (execution.status !== "running" && execution.status !== "paused") {
        throw new BadRequestError(
            `Cannot send message to execution with status: ${execution.status}`
        );
    }

    try {
        // Complete the waitpoint with the user's message
        const tokenId = waitpointId || `agent-message-${executionId}`;
        await wait.completeToken(tokenId, { message });

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
