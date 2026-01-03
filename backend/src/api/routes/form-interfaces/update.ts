import { FastifyInstance } from "fastify";
import { slugify } from "@flowmaestro/shared";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, BadRequestError, validateRequest } from "../../middleware";
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
            const updatePayload = { ...body };
            if (body.slug !== undefined) {
                const slug = slugify(body.slug);
                if (!slug) {
                    throw new BadRequestError("Slug is invalid");
                }
                updatePayload.slug = slug;
            }

            const iface = await repo.update(id, userId, updatePayload);

            return reply.send({
                success: true,
                data: iface
            });
        }
    );
}
