import { FastifyInstance } from "fastify";
import { FolderRepository } from "../../../storage/repositories/FolderRespository";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";
import { folderIdParamSchema } from "../../schemas/folder-schemas";

export async function getFolderRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(folderIdParamSchema)]
        },
        async (request, reply) => {
            const folderRepository = new FolderRepository();
            const { id } = request.params as { id: string };

            const folder = await folderRepository.findById(id, request.user!.id);

            if (!folder) {
                throw new NotFoundError("Folder not found");
            }

            return reply.send({
                success: true,
                data: {
                    id: folder.id,
                    userId: folder.user_id,
                    name: folder.name,
                    color: folder.color,
                    position: folder.position,
                    createdAt: folder.created_at,
                    updatedAt: folder.updated_at
                }
            });
        }
    );
}
