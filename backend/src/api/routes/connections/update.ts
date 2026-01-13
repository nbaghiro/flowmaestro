import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateParams, validateBody } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import {
    connectionIdParamSchema,
    ConnectionIdParam,
    updateConnectionSchema,
    UpdateConnectionRequest
} from "../../schemas/connection-schemas";

export async function updateConnectionRoute(fastify: FastifyInstance) {
    fastify.put(
        "/:id",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateParams(connectionIdParamSchema),
                validateBody(updateConnectionSchema)
            ]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const params = request.params as ConnectionIdParam;
            const body = request.body as UpdateConnectionRequest;

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

            const connection = await connectionRepository.update(params.id, body);

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
