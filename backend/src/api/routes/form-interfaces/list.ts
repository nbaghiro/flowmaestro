import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

export async function listFormInterfacesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const repo = new FormInterfaceRepository();
            const id = request.user!.id;

            const interfaces = await repo.listByUser(id);

            return reply.send({
                success: true,
                data: interfaces
            });
        }
    );
}
