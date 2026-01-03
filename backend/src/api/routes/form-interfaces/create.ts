import { FastifyInstance } from "fastify";
import { slugify } from "@flowmaestro/shared";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, BadRequestError, validateRequest } from "../../middleware";
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

            const slug = slugify(body.slug);
            if (!slug) {
                throw new BadRequestError("Slug is invalid");
            }

            try {
                const available = await repo.isSlugAvailable(id, slug);
                if (!available) {
                    throw new BadRequestError("Slug already in use.");
                }

                const iface = await repo.create(id, { ...body, slug });
                return reply.status(201).send({
                    success: true,
                    data: iface
                });
            } catch (error) {
                if (
                    typeof error === "object" &&
                    error !== null &&
                    "code" in error &&
                    (error as { code?: string }).code === "23505"
                ) {
                    throw new BadRequestError("Slug already in use.");
                }
                throw error;
            }
        }
    );
}
