import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderTreeRoute(fastify: FastifyInstance) {
    fastify.get(
        "/tree",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;

            try {
                const tree = await folderRepo.getFolderTree(userId);

                return reply.send({
                    success: true,
                    data: tree
                });
            } catch (error) {
                logger.error({ userId, error }, "Error getting folder tree");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
