import { FastifyInstance } from "fastify";
import { FolderRepository } from "../../../storage/repositories/FolderRespository";
import { authMiddleware } from "../../middleware";

export async function listFoldersRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const folderRepository = new FolderRepository();

            const folders = await folderRepository.findByUserIdWithCounts(request.user!.id);

            const mappedFolders = folders.map((folder) => ({
                id: folder.id,
                userId: folder.user_id,
                name: folder.name,
                color: folder.color,
                position: folder.position,
                createdAt: folder.created_at,
                updatedAt: folder.updated_at,
                itemCounts: folder.itemCounts
            }));

            return reply.send({
                success: true,
                data: {
                    folders: mappedFolders
                }
            });
        }
    );
}
