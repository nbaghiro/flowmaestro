import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { PersonaInstanceRepository } from "../../../storage/repositories/PersonaInstanceRepository";
import { getTemporalClient } from "../../../temporal/client";
import { skipClarificationSignal } from "../../../temporal/workflows";
import { BadRequestError, NotFoundError } from "../../middleware";

const logger = createServiceLogger("PersonaInstances");

const skipClarificationParamsSchema = z.object({
    id: z.string().uuid()
});

type SkipClarificationParams = z.infer<typeof skipClarificationParamsSchema>;

/**
 * POST /api/persona-instances/:id/skip-clarification
 * Skip the clarifying phase and proceed directly to running
 */
export async function skipClarificationHandler(
    request: FastifyRequest<{
        Params: SkipClarificationParams;
    }>,
    reply: FastifyReply
): Promise<void> {
    const workspaceId = request.workspace!.id;

    // Validate params
    const paramsResult = skipClarificationParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
        throw new BadRequestError(paramsResult.error.errors.map((e) => e.message).join(", "));
    }

    const { id } = paramsResult.data;

    // Get the instance
    const instanceRepo = new PersonaInstanceRepository();
    const instance = await instanceRepo.findByIdAndWorkspaceId(id, workspaceId);

    if (!instance) {
        throw new NotFoundError("Persona instance not found");
    }

    // Verify the instance is in clarifying status
    if (instance.status !== "clarifying" && instance.status !== "initializing") {
        throw new BadRequestError(
            `Cannot skip clarification for instance with status "${instance.status}". Only instances in clarifying or initializing status can skip clarification.`
        );
    }

    // Already completed clarification
    if (instance.clarification_complete || instance.clarification_skipped) {
        throw new BadRequestError("Clarification has already been completed or skipped");
    }

    // Skip clarification in the database
    const updatedInstance = await instanceRepo.skipClarification(id);

    if (!updatedInstance) {
        throw new BadRequestError("Failed to skip clarification");
    }

    // If there's an active execution, send signal to the workflow
    if (instance.execution_id) {
        try {
            const client = await getTemporalClient();
            const handle = client.workflow.getHandle(instance.execution_id);
            await handle.signal(skipClarificationSignal);

            logger.info(
                {
                    personaInstanceId: id,
                    executionId: instance.execution_id
                },
                "Skip clarification signal sent to workflow"
            );
        } catch (error) {
            // Log but don't fail - the database was already updated
            logger.warn(
                {
                    personaInstanceId: id,
                    error: error instanceof Error ? error.message : "Unknown error"
                },
                "Failed to send skip clarification signal to workflow"
            );
        }
    }

    logger.info(
        {
            personaInstanceId: id,
            previousStatus: instance.status,
            newStatus: updatedInstance.status
        },
        "Persona instance clarification skipped"
    );

    reply.code(200).send({
        success: true,
        data: updatedInstance,
        message: "Clarification skipped, starting work"
    });
}
