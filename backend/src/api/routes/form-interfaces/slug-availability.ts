import { FastifyInstance } from "fastify";
import { slugify } from "@flowmaestro/shared";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, BadRequestError } from "../../middleware";

export async function slugAvailabilityRoute(fastify: FastifyInstance) {
    fastify.get(
        "/slug-availability",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { slug, excludeId } = request.query as {
                slug?: string;
                excludeId?: string;
            };

            if (!slug) {
                throw new BadRequestError("Slug is required");
            }

            const normalized = slugify(slug);
            if (!normalized) {
                throw new BadRequestError("Slug is invalid");
            }

            const repo = new FormInterfaceRepository();
            const available = await repo.isSlugAvailable(request.user!.id, normalized, excludeId);

            return reply.send({
                success: true,
                data: {
                    available,
                    slug: normalized
                }
            });
        }
    );
}
