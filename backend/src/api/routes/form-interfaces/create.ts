import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, validateRequest } from "../../middleware";
import {
    createFormInterfaceSchema,
    type CreateFormInterfaceRequest
} from "../../schemas/form-interface-schemas";

export async function createFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware, validateRequest(createFormInterfaceSchema)]
        },
        async (request, reply) => {
            const repo = new FormInterfaceRepository();
            const body = request.body as CreateFormInterfaceRequest;
            const id = request.user.id;

            const iface = await repo.create(id, body);

            return reply.status(201).send({
                success: true,
                data: iface
            });
        }
    );
}
