/**
 * GET /triggers/providers - List available trigger providers
 * GET /triggers/providers/:providerId - Get provider details with events
 */

import { z } from "zod";
import { createRequestLogger } from "../../../core/logging";
import { providerRegistry } from "../../../integrations/registry";
import type { TriggerProviderCategory } from "../../../integrations/core/types";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const querySchema = z.object({
    category: z.string().optional()
});

const paramsSchema = z.object({
    providerId: z.string()
});

export async function triggerProvidersRoute(fastify: FastifyInstance) {
    // List all trigger providers
    fastify.get("/providers", async (request: FastifyRequest, reply: FastifyReply) => {
        const logger = createRequestLogger(request);
        logger.info("Listing trigger providers");

        const query = querySchema.parse(request.query);

        let providers;
        if (query.category) {
            providers = await providerRegistry.getTriggerProvidersByCategory(
                query.category as TriggerProviderCategory
            );
        } else {
            providers = await providerRegistry.getTriggerProviders();
        }

        // Return providers with their events count for the list view
        const providersWithCounts = providers.map((provider) => ({
            providerId: provider.providerId,
            name: provider.name,
            description: provider.description,
            icon: provider.icon,
            category: provider.category,
            eventCount: provider.triggers.length,
            requiresConnection: provider.requiresConnection,
            webhookSetupType: provider.webhookConfig.setupType
        }));

        reply.send({
            success: true,
            data: {
                providers: providersWithCounts
            }
        });
    });

    // Get provider details with all events
    fastify.get("/providers/:providerId", async (request: FastifyRequest, reply: FastifyReply) => {
        const logger = createRequestLogger(request);
        const params = paramsSchema.parse(request.params);

        logger.info({ providerId: params.providerId }, "Getting trigger provider details");

        const provider = await providerRegistry.getTriggerProvider(params.providerId);

        if (!provider) {
            reply.status(404).send({
                success: false,
                error: `Provider not found: ${params.providerId}`
            });
            return;
        }

        reply.send({
            success: true,
            data: {
                provider
            }
        });
    });

    // Get events for a specific provider
    fastify.get(
        "/providers/:providerId/events",
        async (request: FastifyRequest, reply: FastifyReply) => {
            const logger = createRequestLogger(request);
            const params = paramsSchema.parse(request.params);

            logger.info({ providerId: params.providerId }, "Listing trigger events for provider");

            const provider = await providerRegistry.getTriggerProvider(params.providerId);

            if (!provider) {
                reply.status(404).send({
                    success: false,
                    error: `Provider not found: ${params.providerId}`
                });
                return;
            }

            reply.send({
                success: true,
                data: {
                    providerId: provider.providerId,
                    events: provider.triggers
                }
            });
        }
    );
}
