/**
 * Get System Workflow by Key Route
 *
 * Admin-only route to fetch system workflows by their system_key.
 * Used for loading system workflows in Flow Builder for testing and editing.
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { WorkflowRepository } from "../../../storage/repositories";
import { authMiddleware, adminMiddleware, validateParams, NotFoundError } from "../../middleware";

const systemKeyParamSchema = z.object({
    key: z.string().min(1).max(255)
});

export async function getWorkflowBySystemKeyRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { key: string } }>(
        "/system/:key",
        {
            preHandler: [authMiddleware, adminMiddleware, validateParams(systemKeyParamSchema)]
        },
        async (request, reply) => {
            const workflowRepository = new WorkflowRepository();
            const { key } = request.params;

            const workflow = await workflowRepository.findBySystemKey(key);

            if (!workflow) {
                throw new NotFoundError(`System workflow '${key}' not found`);
            }

            return reply.send({
                success: true,
                data: workflow
            });
        }
    );
}
