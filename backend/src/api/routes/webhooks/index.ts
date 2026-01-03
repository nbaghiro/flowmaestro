import { FastifyInstance } from "fastify";
import { airtableWebhookRoutes } from "./airtable";
import { discordWebhookRoutes } from "./discord";
import { githubWebhookRoutes } from "./github";
import { googleCalendarWebhookRoutes } from "./google-calendar";
import { googleDriveWebhookRoutes } from "./google-drive";
import { googleSheetsWebhookRoutes } from "./google-sheets";
import { metaWebhookRoutes } from "./meta";
import { genericProviderWebhookRoutes } from "./provider";
import { shopifyWebhookRoutes } from "./shopify";
import { slackWebhookRoutes } from "./slack";
import { stripeWebhookRoutes } from "./stripe";

export async function webhookRoutes(fastify: FastifyInstance) {
    // Register Meta webhook routes (WhatsApp, Instagram, Messenger, Facebook)
    await fastify.register(metaWebhookRoutes);

    // Register Shopify webhook routes
    await fastify.register(shopifyWebhookRoutes);

    // Register GitHub webhook routes
    await fastify.register(githubWebhookRoutes);

    // Register Slack webhook routes
    await fastify.register(slackWebhookRoutes);

    // Register Airtable webhook routes
    await fastify.register(airtableWebhookRoutes);

    // Register Stripe webhook routes
    await fastify.register(stripeWebhookRoutes);

    // Register Discord webhook routes
    await fastify.register(discordWebhookRoutes);

    // Register Google webhook routes
    await fastify.register(googleSheetsWebhookRoutes);
    await fastify.register(googleCalendarWebhookRoutes);
    await fastify.register(googleDriveWebhookRoutes);

    // Register generic provider webhook routes (catch-all for other providers)
    await fastify.register(genericProviderWebhookRoutes);
}
