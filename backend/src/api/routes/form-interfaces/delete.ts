import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function deleteFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
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

                const deleted = await formInterfaceRepo.softDelete(id, userId);

                if (!deleted) {
                    return reply.status(500).send({
                        success: false,
                        error: "Failed to delete form interface"
                    });
                }

                logger.info({ formInterfaceId: id, userId }, "Form interface deleted");

                return reply.send({
                    success: true,
                    message: "Form interface deleted successfully"
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error deleting form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
