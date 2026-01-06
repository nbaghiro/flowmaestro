import { FastifyInstance } from "fastify";
import { FolderRepository } from "../../../storage/repositories/FolderRespository";
import { authMiddleware, validateRequest, BadRequestError } from "../../middleware";
import { createFolderSchema, CreateFolderRequest } from "../../schemas/folder-schemas";

export async function createFolderRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [authMiddleware, validateRequest(createFolderSchema)]
        },
        async (request, reply) => {
            const folderRepository = new FolderRepository();
            const body = request.body as CreateFolderRequest;

            const isAvailable = await folderRepository.isNameAvailable(body.name, request.user!.id);

            if (!isAvailable) {
                throw new BadRequestError("A folder with this name already exists");
            }

            const folder = await folderRepository.create({
                user_id: request.user!.id,
                name: body.name,
                color: body.color
            });

            return reply.status(201).send({
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
