import { FastifyInstance } from "fastify";
import { FolderRepository } from "../../../storage/repositories/FolderRespository";
import { authMiddleware, validateParams, NotFoundError } from "../../middleware";
import { folderIdParamSchema } from "../../schemas/folder-schemas";

export async function deleteFolderRoute(fastify: FastifyInstance) {
    fastify.delete(
        "/:id",
        {
            preHandler: [authMiddleware, validateParams(folderIdParamSchema)]
        },
        async (request, reply) => {
            const folderRepository = new FolderRepository();
            const { id } = request.params as { id: string };

            const existingFolder = await folderRepository.findById(id, request.user!.id);
            if (!existingFolder) {
                throw new NotFoundError("Folder not found");
            }

            // Soft delete the folder (items will return to root ON DELETE SET NULL)
            const deleted = await folderRepository.softDelete(id, request.user!.id);

            if (!deleted) {
                throw new NotFoundError("Folder not found");
            }

            return reply.send({
                success: true,
                message: "Folder deleted successfully"
            });
        }
    );
}
