import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>(
        "/:id",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepo = new FolderRepository();
            const userId = request.user!.id;
            const { id } = request.params;

            try {
                const folder = await folderRepo.findByIdAndUserId(id, userId);

                if (!folder) {
                    return reply.status(404).send({
                        success: false,
                        error: "Folder not found"
                    });
                }

                // Get item counts
                const itemCounts = await folderRepo.getItemCounts(id);

                return reply.send({
                    success: true,
                    data: {
                        id: folder.id,
                        userId: folder.user_id,
                        name: folder.name,
                        color: folder.color,
                        position: folder.position,
                        createdAt: folder.created_at,
                        updatedAt: folder.updated_at,
                        itemCounts
                    }
                });
            } catch (error) {
                logger.error({ userId, folderId: id, error }, "Error getting folder");
                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    );
}
