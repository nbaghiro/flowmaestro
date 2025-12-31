import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, NotFoundError } from "../../middleware";

export async function publishFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/publish",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            const repo = new FormInterfaceRepository();
            const iface = await repo.publish(id, userId);

            if (!iface) {
                throw new NotFoundError("Form interface not found");
            }

            return reply.send({
                success: true,
                data: iface
            });
        }
    );
}
