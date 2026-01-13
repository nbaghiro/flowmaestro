import { FastifyInstance } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";
import { authMiddleware, validateParams } from "../../middleware";
import { workspaceContextMiddleware } from "../../middleware/workspace-context";
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
