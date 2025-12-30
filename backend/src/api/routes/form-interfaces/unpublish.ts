import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

export async function unpublishFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/unpublish",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            const repo = new FormInterfaceRepository();
            const iface = await repo.unpublish(id, userId);

            if (!iface) {
                return reply.code(404).send({ error: "Not found" });
            }

            return reply.send({
                success: true,
                data: iface
            });
        }
    );
}
