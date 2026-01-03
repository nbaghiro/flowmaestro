import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function unpublishFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/unpublish",
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

                // Check if already draft
                if (existing.status === "draft") {
                    return reply.send({
                        success: true,
                        data: existing,
                        message: "Form interface is already unpublished"
                    });
                }

                const formInterface = await formInterfaceRepo.unpublish(id, userId);

                if (!formInterface) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to unpublish form interface"
                    });
                }

                logger.info({ formInterfaceId: id, userId }, "Form interface unpublished");

                return reply.send({
                    success: true,
                    data: formInterface
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error unpublishing form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
