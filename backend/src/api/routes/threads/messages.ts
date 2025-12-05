import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { AgentExecutionRepository } from "../../../storage/repositories/AgentExecutionRepository";
import { ThreadRepository } from "../../../storage/repositories/ThreadRepository";
import { NotFoundError } from "../../middleware";

const getThreadMessagesParamsSchema = z.object({
    id: z.string().uuid()
});

export async function getThreadMessagesHandler(
    request: FastifyRequest<{ Params: z.infer<typeof getThreadMessagesParamsSchema> }>,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user!.id;
    const { id: threadId } = getThreadMessagesParamsSchema.parse(request.params);

    const threadRepo = new ThreadRepository();
    const thread = await threadRepo.findByIdAndUserId(threadId, userId);

    if (!thread) {
        throw new NotFoundError("Thread not found");
    }

    const executionRepo = new AgentExecutionRepository();
    const messages = await executionRepo.getMessagesByThread(threadId);

    // Convert to ThreadMessage format
    const threadMessages = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls || undefined,
        timestamp: msg.created_at.toISOString()
    }));

    reply.send({
        success: true,
        data: {
            messages: threadMessages
        }
    });
}
