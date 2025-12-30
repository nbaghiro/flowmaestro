import { FastifyInstance } from "fastify";
import type { UpdateFormInterfaceInput } from "@flowmaestro/shared/src/types/form-interface";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

export async function updateFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;
            const body = request.body as UpdateFormInterfaceInput;

            const repo = new FormInterfaceRepository();
            const iface = await repo.update(id, userId, body);

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
