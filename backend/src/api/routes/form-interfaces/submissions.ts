import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { FormInterfaceSubmissionRepository } from "../../../storage/repositories/FormInterfaceSubmissionRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FormInterfaceRoutes");

export async function listFormInterfaceSubmissionsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id/submissions",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const formInterfaceRepo = new FormInterfaceRepository();
            const submissionRepo = new FormInterfaceSubmissionRepository();
            const { id } = request.params as { id: string };
            const userId = request.user!.id;
            const query = request.query as { limit?: string; offset?: string };

            try {
                // Check if form interface exists and belongs to user
                const formInterface = await formInterfaceRepo.findById(id, userId);
                if (!formInterface) {
                    return reply.status(404).send({
                        success: false,
                        error: "Form interface not found"
                    });
                }

                const limit = query.limit ? parseInt(query.limit) : 50;
                const offset = query.offset ? parseInt(query.offset) : 0;

                const { submissions, total } = await submissionRepo.findByInterfaceId(id, {
                    limit,
                    offset
                });

                const page = Math.floor(offset / limit) + 1;
                const hasMore = offset + submissions.length < total;

                return reply.send({
                    success: true,
                    data: {
                        items: submissions,
                        total,
                        page,
                        pageSize: limit,
                        hasMore
                    }
                });
            } catch (error) {
                logger.error({ id, userId, error }, "Error listing form interface submissions");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
