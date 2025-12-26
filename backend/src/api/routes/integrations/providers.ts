import { createServiceLogger } from "../../../core/logging";
import { providerRegistry } from "../../../integrations/registry";
import type { FastifyRequest, FastifyReply } from "fastify";

const logger = createServiceLogger("IntegrationProviders");

/**
 * Get all available providers
 */
export async function getProvidersHandler(
    _request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        const providers = await providerRegistry.getProviderSummaries();

        reply.code(200).send({
            success: true,
            data: providers
        });
    } catch (error) {
        logger.error({ error }, "Error getting providers");

        reply.code(500).send({
            success: false,
            error: {
                message: error instanceof Error ? error.message : "Failed to get providers"
            }
        });
    }
}
