import { FastifyInstance } from "fastify";
import { FormInterfaceRepository } from "../../../storage/repositories/FormInterfaceRepository";
import { authMiddleware, validateQuery } from "../../middleware";
import {
    listFormInterfacesQuerySchema,
    type ListFormInterfacesQuery
} from "../../schemas/form-interface-schemas";

export async function listFormInterfacesRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, validateQuery(listFormInterfacesQuerySchema)]
        },
        async (request, reply) => {
            const repo = new FormInterfaceRepository();
            const userId = request.user!.id;
            const { workflowId, agentId } = request.query as ListFormInterfacesQuery;

            const interfaces = workflowId
                ? await repo.listByWorkflowId(userId, workflowId)
                : agentId
                  ? await repo.listByAgentId(userId, agentId)
                  : await repo.listByUser(userId);

            return reply.send({
                success: true,
                data: interfaces
            });
        }
    );
}
