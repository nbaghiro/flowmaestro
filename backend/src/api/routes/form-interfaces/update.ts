import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, validateRequest } from "../../middleware";
import {
    updateFormInterfaceSchema,
    type UpdateFormInterfaceRequest
} from "../../schemas/form-interface-schemas";

export async function updateFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [authMiddleware, validateRequest(updateFormInterfaceSchema)]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;
            const body = request.body as UpdateFormInterfaceRequest;

            const repo = new FormInterfaceRepository();
            const iface = await repo.update(id, userId, body);

            return reply.send({
                success: true,
                data: iface
            });
        }
    );
}
