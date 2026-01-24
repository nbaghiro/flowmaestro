import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { PersonaInstanceMessageRepository } from "../../../storage/repositories/PersonaInstanceMessageRepository";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { getTemporalClient } from "../../../temporal/client";
import { personaUserMessageSignal } from "../../../temporal/workflows";
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

    // Check if we have an execution ID to send the signal to
    if (!instance.execution_id) {
        throw new BadRequestError("Instance does not have an active execution");
    }

    try {
        // Save the user message to the database for the conversation history
        const messageRepo = new PersonaInstanceMessageRepository();
        await messageRepo.create({
            instance_id: id,
            thread_id: instance.thread_id || undefined,
            role: "user",
            content: content
        });

        // Send signal to Temporal workflow
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(instance.execution_id);

        await handle.signal(personaUserMessageSignal, content);

        reply.send({
            success: true,
            data: {
                message: "Message sent successfully",
                instance_id: id
            }
        });
    } catch (error) {
        throw new BadRequestError(
            error instanceof Error ? error.message : "Failed to send message to persona"
        );
    }
}
