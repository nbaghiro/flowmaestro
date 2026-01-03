/**
 * Generic Provider Webhook Handler
 *
 * Handles incoming webhooks from any integration provider.
 * This is a catch-all route for providers that don't have
 * specific handlers implemented.
 *
 * Route: POST /provider/:providerId/:triggerId
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerRegistry } from "../../../integrations/registry";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("ProviderWebhook");

interface ProviderWebhookParams {
    providerId: string;
    triggerId: string;
}

export async function genericProviderWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Generic Provider Webhook Receiver
     * Route: POST /provider/:providerId/:triggerId
     *
     * This route handles webhooks for any provider.
     * Provider-specific signature verification is handled by the service.
     */
    fastify.post(
        "/provider/:providerId/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for signature verification
            }
        },
        async (request: FastifyRequest<{ Params: ProviderWebhookParams }>, reply: FastifyReply) => {
            const { providerId, triggerId } = request.params;

            // Validate provider exists (async call)
            const provider = await providerRegistry.getTriggerProvider(providerId);
            if (!provider) {
                logger.warn({ providerId, triggerId }, "Unknown provider for webhook");
                return reply.status(400).send({
                    success: false,
                    error: `Unknown provider: ${providerId}`
                });
            }

            logger.info(
                { providerId, triggerId, providerName: provider.name },
                "Received provider webhook"
            );

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId,
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: request.body,
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            return reply.status(response.statusCode).send({
                success: response.success,
                executionId: response.executionId,
                message: response.message,
                error: response.error
            });
        }
    );

    /**
     * Generic Provider Webhook Verification (GET)
     * Some providers send a GET request to verify the endpoint exists
     */
    fastify.get(
        "/provider/:providerId/:triggerId",
        async (request: FastifyRequest<{ Params: ProviderWebhookParams }>, reply: FastifyReply) => {
            const { providerId, triggerId } = request.params;

            // Validate provider exists (async call)
            const provider = await providerRegistry.getTriggerProvider(providerId);
            if (!provider) {
                return reply.status(400).send({
                    success: false,
                    error: `Unknown provider: ${providerId}`
                });
            }

            logger.info({ providerId, triggerId }, "Provider webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: `${provider.name} webhook endpoint is active`,
                provider: providerId,
                triggerId
            });
        }
    );

    /**
     * List supported providers endpoint
     * Useful for debugging and documentation
     */
    fastify.get("/provider", async (_request: FastifyRequest, reply: FastifyReply) => {
        const providers = await providerRegistry.getTriggerProviders();

        return reply.status(200).send({
            success: true,
            providers: providers.map((p) => ({
                id: p.providerId,
                name: p.name,
                webhookSetupType: p.webhookConfig.setupType,
                signatureType: p.webhookConfig.signatureType
            }))
        });
    });
}
