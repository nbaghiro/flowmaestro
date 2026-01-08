import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderContentsRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>(
        "/:id/contents",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;
            const { id } = request.params;

            try {
                const contents = await folderRepo.getContents(id, userId);

                if (!contents) {
                    return reply.status(404).send({
                        success: false,
                        error: "Folder not found"
                    });
                }

                return reply.send({
                    success: true,
                    data: contents
                });
            } catch (error) {
                logger.error({ userId, folderId: id, error }, "Error getting folder contents");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
