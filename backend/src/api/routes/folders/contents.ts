import { FastifyInstance } from "fastify";
import { FolderRepository } from "../../../storage/repositories/FolderRespository";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";
import { folderIdParamSchema } from "../../schemas/folder-schemas";

export async function getFolderContentsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id/contents",
        {
            preHandler: [authMiddleware, validateParams(folderIdParamSchema)]
        },
        async (request, reply) => {
            const folderRepository = new FolderRepository();
            const { id } = request.params as { id: string };

            const contents = await folderRepository.getContents(id, request.user!.id);

            if (!contents) {
                throw new NotFoundError("Folder not found");
            }

            return reply.send({
                success: true,
                data: {
                    folder: {
                        id: contents.folder.id,
                        userId: contents.folder.user_id,
                        name: contents.folder.name,
                        color: contents.folder.color,
                        position: contents.folder.position,
                        createdAt: contents.folder.created_at,
                        updatedAt: contents.folder.updated_at
                    },
                    items: contents.items
                }
            });
        }
    );
}
