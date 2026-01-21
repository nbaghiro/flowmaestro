import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { BadRequestError, NotFoundError } from "../../middleware";

const sendMessageSchema = z.object({
    content: z.string().min(1).max(10000)
});

interface SendMessageParams {
    id: string;
}

type SendMessageBody = z.infer<typeof sendMessageSchema>;

export async function sendPersonaInstanceMessageHandler(
    request: FastifyRequest<{ Params: SendMessageParams; Body: SendMessageBody }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;
    const { id } = request.params;

    // Validate body
    const parseResult = sendMessageSchema.safeParse(request.body);
    if (!parseResult.success) {
        throw new BadRequestError(parseResult.error.errors.map((e) => e.message).join(", "));
    }
    const { content } = parseResult.data;

    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Check if instance is in a state that accepts messages
    const activeStates = ["initializing", "clarifying", "running", "waiting_approval"];
    if (!activeStates.includes(instance.status)) {
        throw new BadRequestError(`Cannot send message to instance in "${instance.status}" state`);
    }

    // TODO: In a full implementation, we would:
    // 1. Add the message to the thread
    // 2. Trigger the agent to process the message
    // 3. Return the updated conversation state
    // For now, we just acknowledge the message

    reply.send({
        success: true,
        data: {
            message: "Message received",
            instance_id: id,
            content: content
        }
    });
}
