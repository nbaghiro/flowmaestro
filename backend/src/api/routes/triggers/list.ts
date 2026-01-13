import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { TriggerType } from "../../../storage/models/Trigger";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";

const logger = createServiceLogger("TriggerRoutes");

export async function listTriggersRoute(fastify: FastifyInstance) {
    fastify.get("/", async (request, reply) => {
        const triggerRepo = new TriggerRepository();
        const workspaceId = request.workspace!.id;
        const query = request.query as { workflowId?: string; type?: string; enabled?: string };

        try {
            // Get triggers for workspace with optional filters
            const triggers = await triggerRepo.findByWorkspaceId(workspaceId, {
                workflowId: query.workflowId,
                type: query.type as TriggerType | undefined,
                enabled: query.enabled !== undefined ? query.enabled === "true" : undefined
            });

            return reply.send({
                success: true,
                data: triggers
            });
        } catch (error) {
            logger.error({ error }, "Error listing triggers");
            return reply.status(500).send({
                success: false,
                error: String(error)
            });
        }
    });
}
