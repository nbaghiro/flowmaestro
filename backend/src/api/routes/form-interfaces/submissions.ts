import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { InterfaceSubmissionRepository } from "../../../storage/repositories/InterfaceSubmissionRepository";
import { authMiddleware, NotFoundError } from "../../middleware";

export async function listFormInterfaceSubmissionsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id/submissions",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const { id } = request.params as { id: string };
            const userId = request.user!.id;

            const interfaceRepo = new FormInterfaceRepository();
            const iface = await interfaceRepo.findById(id, userId);

            if (!iface) {
                throw new NotFoundError("Form interface not found");
            }

            const submissionRepo = new InterfaceSubmissionRepository();
            const submissions = await submissionRepo.listByInterface(id);

            return reply.send({
                success: true,
                data: submissions.map((submission) => ({
                    id: submission.id,
                    createdAt: submission.submittedAt,
                    inputText: submission.message ?? undefined,
                    files: submission.files ?? [],
                    urls: submission.urls ?? []
                }))
            });
        }
    );
}
