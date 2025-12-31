import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, NotFoundError } from "../../middleware";

export async function deleteFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            const repo = new FormInterfaceRepository();
            const success = await repo.softDelete(id, userId);

            if (!success) {
                throw new NotFoundError("Form interface not found");
            }

            return reply.send({
                success: true
            });
        }
    );
}
