import { FastifyInstance } from "fastify";
import type { CreateFormInterfaceInput } from "@flowmaestro/shared/src/types/form-interface";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware } from "../../middleware";

export async function createFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const repo = new FormInterfaceRepository();
            const body = request.body as CreateFormInterfaceInput;
            const id = request.user.id;

            const iface = await repo.create(id, body);

            return reply.status(201).send({
                success: true,
                data: iface
            });
        }
    );
}
