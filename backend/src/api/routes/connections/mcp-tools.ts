import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { connectionIdParamSchema, ConnectionIdParam } from "../../schemas/connection-schemas";

const logger = createServiceLogger("MCPTools");

const executionRouter = new ExecutionRouter(providerRegistry);

/**
 * Get MCP tools available from a connection's provider
 * Returns the tools that can be used by agents for this connection
 */
export async function mcpToolsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id/mcp-tools",
        {
            preHandler: [authMiddleware, validateParams(connectionIdParamSchema)]
        },
        async (request, reply) => {
            const connectionRepository = new ConnectionRepository();
            const params = request.params as ConnectionIdParam;

            // Get connection
            const connection = await connectionRepository.findById(params.id);

            if (!connection) {
                return reply.status(404).send({
                    success: false,
                    error: "Connection not found"
                });
            }

            // Verify ownership
            const ownerId = await connectionRepository.getOwnerId(params.id);
            if (ownerId !== request.user!.id) {
                return reply.status(403).send({
                    success: false,
                    error: "You do not have permission to access this connection"
                });
            }

            try {
                // Get MCP tools from the provider
                const tools = await executionRouter.getMCPTools(connection.provider);

                return reply.send({
                    success: true,
                    data: {
                        connectionId: params.id,
                        provider: connection.provider,
                        connectionName: connection.name,
                        tools
                    }
                });
            } catch (error) {
                logger.error({ connectionId: params.id, error }, "Error getting MCP tools");

                // Provider might not have MCP tools implemented
                return reply.status(400).send({
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to get MCP tools for this provider"
                });
            }
        }
    );
}
