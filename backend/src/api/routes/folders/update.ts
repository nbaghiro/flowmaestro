import { FastifyInstance } from "fastify";
import { FolderRepository } from "../../../storage/repositories/FolderRespository";
import {
    authMiddleware,
    validateRequest,
    validateParams,
    NotFoundError,
    BadRequestError
} from "../../middleware";
import {
    updateFolderSchema,
    folderIdParamSchema,
    UpdateFolderRequest
} from "../../schemas/folder-schemas";

export async function updateFolderRoute(fastify: FastifyInstance) {
    fastify.patch(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                validateParams(folderIdParamSchema),
                validateRequest(updateFolderSchema)
            ]
        },
        async (request, reply) => {
            const folderRepository = new FolderRepository();
            const { id } = request.params as { id: string };
            const body = request.body as UpdateFolderRequest;

            const existingFolder = await folderRepository.findById(id, request.user!.id);
            if (!existingFolder) {
                throw new NotFoundError("Folder not found");
            }

            if (body.name && body.name !== existingFolder.name) {
                const isAvailable = await folderRepository.isNameAvailable(
                    body.name,
                    request.user!.id,
                    id
                );

                if (!isAvailable) {
                    throw new BadRequestError("A folder with this name already exists");
                }
            }

            const updated = await folderRepository.update(id, request.user!.id, {
                name: body.name,
                color: body.color,
                position: body.position
            });

            if (!updated) {
                throw new NotFoundError("Folder not found");
            }

            return reply.send({
                success: true,
                data: {
                    id: updated.id,
                    userId: updated.user_id,
                    name: updated.name,
                    color: updated.color,
                    position: updated.position,
                    createdAt: updated.created_at,
                    updatedAt: updated.updated_at
                }
            });
        }
    );
}
