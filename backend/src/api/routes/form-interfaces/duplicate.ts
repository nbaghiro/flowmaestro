import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, NotFoundError } from "../../middleware";

function buildDuplicateName(name: string): string {
    const suffix = " (Copy)";
    const trimmed = name.length + suffix.length > 255 ? name.slice(0, 255 - suffix.length) : name;
    return `${trimmed}${suffix}`;
}

function buildDuplicateSlug(slug: string): string {
    const suffix = `-copy-${Math.random().toString(36).slice(2, 6)}`;
    const trimmed = slug.slice(0, Math.max(1, 100 - suffix.length));
    return `${trimmed}${suffix}`;
}

export async function duplicateFormInterfaceRoute(fastify: FastifyInstance) {
    fastify.post(
        "/:id/duplicate",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            const repo = new FormInterfaceRepository();
            const existing = await repo.findById(id, userId);

            if (!existing) {
                throw new NotFoundError("Form interface not found");
            }

            const duplicate = await repo.duplicate(
                id,
                userId,
                buildDuplicateName(existing.name),
                buildDuplicateSlug(existing.slug)
            );

            if (!duplicate) {
                throw new NotFoundError("Form interface not found");
            }

            return reply.status(201).send({
                success: true,
                data: duplicate
            });
        }
    );
}
