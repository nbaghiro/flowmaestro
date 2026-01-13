import { FastifyInstance } from "fastify";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateBody } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
import { createConnectionSchema, CreateConnectionRequest } from "../../schemas/connection-schemas";

export async function createConnectionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                validateBody(createConnectionSchema)
            ]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const body = request.body as CreateConnectionRequest;

            const connection = await connectionRepository.create({
                ...body,
                user_id: request.user!.id,
                workspace_id: request.workspace!.id
            });

            return reply.status(201).send({
                success: true,
                data: connection
            });
        }
    );
}
