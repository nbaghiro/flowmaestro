import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function getFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            try {
                const formInterface = await formInterfaceRepo.findById(id, userId);

                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                return reply.send({
                    success: true,
                    data: formInterface
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error fetching form interface");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
