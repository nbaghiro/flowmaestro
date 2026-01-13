import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderContentsRoute(fastify: FastifyInstance) {
    fastify.get<{ Params: { id: string } }>("/:id/contents", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;
        const { id } = request.params;

        try {
            const contents = await folderRepo.getContentsInWorkspace(id, workspaceId);

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
            logger.error({ workspaceId, folderId: id, error }, "Error getting folder contents");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
