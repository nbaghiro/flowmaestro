import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function duplicateFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/duplicate",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            try {
                // Check if form interface exists
                const existing = await formInterfaceRepo.findById(id, userId);
                if (!existing) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                const duplicated = await formInterfaceRepo.duplicate(id, userId);

                if (!duplicated) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to duplicate form interface"
                    });
                }

                logger.info(
                    { originalId: id, newId: duplicated.id, userId },
                    "Form interface duplicated"
                );

                return reply.status(201).send({
                    success: true,
                    data: duplicated
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error duplicating form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
