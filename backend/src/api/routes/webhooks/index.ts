import { FastifyInstance } from "fastify";
import { metaWebhookRoutes } from "./meta";
import { shopifyWebhookRoutes } from "./shopify";

export async function webhookRoutes(fastify: FastifyInstance) {
    // Register Meta webhook routes (WhatsApp, Instagram, Messenger, Facebook)
    await fastify.register(metaWebhookRoutes);

    // Register Shopify webhook routes
    await fastify.register(shopifyWebhookRoutes);
}
