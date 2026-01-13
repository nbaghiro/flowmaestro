import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";

export async function getConnectionRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateParams(connectionIdParamSchema)
            ]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const params = request.params as ConnectionIdParam;

            // Find by ID and workspace ID in one query (verifies ownership)
            const connection = await connectionRepository.findByIdAndWorkspaceId(
                params.id,
                request.workspace!.id
            );

            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            return reply.send({
                success: true,
                data: connection
            });
        }
    );
}
