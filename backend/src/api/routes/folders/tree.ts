import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { FolderRepository } from "../../../storage/repositories/FolderRepository";

const logger = createServiceLogger("FolderRoutes");

export async function getFolderTreeRoute(fastify: FastifyInstance) {
    fastify.get("/tree", async (request, reply) => {
        const folderRepo = new FolderRepository();
        const workspaceId = request.workspace!.id;

        try {
            const tree = await folderRepo.getFolderTreeByWorkspace(workspaceId);

            return reply.send({
                success: true,
                data: tree
            });
        } catch (error) {
            logger.error({ workspaceId, error }, "Error getting folder tree");
            return reply.status(500).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
