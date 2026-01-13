import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";

export async function deleteConnectionRoute(fastify: FastifyInstance) {
    fastify.delete(
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

            // Verify ownership by checking workspace
            const existing = await connectionRepository.findByIdAndWorkspaceId(
                params.id,
                request.workspace!.id
            );
            if (!existing) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            const deleted = await connectionRepository.delete(params.id);

            if (!deleted) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            return reply.send({
                success: true,
                message: "Connection deleted successfully"
            });
        }
    );
}
