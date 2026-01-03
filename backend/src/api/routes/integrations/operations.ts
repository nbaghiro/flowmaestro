import { z } from "zod";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("IntegrationOperations");

const executionRouter = new ExecutionRouter(providerRegistry);

/**
 * Request params schema
 */
const getOperationsParamsSchema = z.object({
    provider: z.string()
});

/**
 * Request query schema
 */
const getOperationsQuerySchema = z.object({
    nodeType: z.enum(["action", "integration"]).optional()
});

interface GetOperationsParams {
    provider: string;
}

interface GetOperationsQuery {
    nodeType?: "action" | "integration";
}

/**
 * Get all operations for a provider
 * Optionally filter by nodeType:
 * - "action": Returns only write operations (send, create, update, delete)
 * - "integration": Returns only read operations (list, get, search, query)
 * - undefined: Returns all operations
 */
export async function getOperationsHandler(
    request: FastifyRequest<{ Params: GetOperationsParams; Querystring: GetOperationsQuery }>,
    reply: FastifyReply
): Promise<void> {
    try {
        // Validate params and query
        const params = getOperationsParamsSchema.parse(request.params);
        const query = getOperationsQuerySchema.parse(request.query);

        // Get all operations
        let operations = await executionRouter.discoverOperations(params.provider);

        // Filter by nodeType if specified
        if (query.nodeType) {
            const targetActionType = query.nodeType === "action" ? "write" : "read";
            operations = operations.filter((op) => op.actionType === targetActionType);
        }

        reply.code(200).send({
            success: true,
            data: {
                provider: params.provider,
                operations
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error(
            {
                provider: request.params.provider,
                error: errorMessage,
                stack: errorStack
            },
            "Error getting operations"
        );

        reply.code(500).send({
            success: false,
            error: {
                message: errorMessage,
                ...(config.env === "development" && { stack: errorStack })
            }
        });
    }
}
