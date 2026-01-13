import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function listFoldersRoute(fastify: FastifyInstance) {
    fastify.get("/", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;

        try {
            const folders = await folderRepo.findByWorkspaceIdWithCounts(workspaceId);

            return reply.send({
                success: true,
                data: folders
            });
        } catch (error) {
            logger.error({ workspaceId, error }, "Error listing folders");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
