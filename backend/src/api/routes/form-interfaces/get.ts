import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

export async function getFormInterfacesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            const repo = new FormInterfaceRepository();
            const iface = await repo.findById(id, userId);

            if (!iface) {
                return reply.status(404).send({ error: "Not found" });
            }

            return reply.send({
                success: true,
                data: iface
            });
        }
    );
}
