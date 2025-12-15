import { z } from "zod";
import { config } from "../../../core/config";
import { ExecutionRouter } from "../../../integrations/core/ExecutionRouter";
import { providerRegistry } from "../../../integrations/registry";
import type { FastifyRequest, FastifyReply } from "fastify";

const executionRouter = new ExecutionRouter(providerRegistry);

/**
 * Request params schema
 */
const getOperationsParamsSchema = z.object({
    provider: z.string()
});

interface GetOperationsParams {
    provider: string;
}

/**
 * Get all operations for a provider
 */
export async function getOperationsHandler(
    request: FastifyRequest<{ Params: GetOperationsParams }>,
    reply: FastifyReply
): Promise<void> {
    try {
        // Validate params
        const params = getOperationsParamsSchema.parse(request.params);

        // Get operations
        const operations = await executionRouter.discoverOperations(params.provider);

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

        console.error("[API] Error getting operations:", {
            provider: request.params.provider,
            error: errorMessage,
            stack: errorStack
        });

        reply.code(500).send({
            success: false,
            error: {
                message: errorMessage,
                ...(config.env === "development" && { stack: errorStack })
            }
        });
    }
}
