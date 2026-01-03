/**
 * Shopify Webhook Handler
 *
 * Handles incoming webhooks from Shopify for:
 * - Order events (created, updated, paid, fulfilled, cancelled)
 * - Product events (created, updated, deleted)
 * - Customer events (created, updated)
 * - Inventory events
 * - App lifecycle events
 *
 * Signature verification uses X-Shopify-Hmac-Sha256 header with HMAC-SHA256
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("ShopifyWebhook");

interface ShopifyWebhookHeaders {
    "x-shopify-hmac-sha256"?: string;
    "x-shopify-topic"?: string;
    "x-shopify-shop-domain"?: string;
    "x-shopify-api-version"?: string;
    "x-shopify-webhook-id"?: string;
}

export async function shopifyWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Shopify Webhook Receiver
     * Route: POST /shopify/:triggerId
     *
     * Receives and processes Shopify webhook events.
     * HMAC signature verification is handled by the provider webhook service.
     */
    fastify.post(
        "/shopify/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for HMAC signature verification
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const headers = request.headers as ShopifyWebhookHeaders;

            const topic = headers["x-shopify-topic"];
            const shopDomain = headers["x-shopify-shop-domain"];
            const webhookId = headers["x-shopify-webhook-id"];

            logger.info({ triggerId, topic, shopDomain, webhookId }, "Received Shopify webhook");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "shopify",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...(request.body as Record<string, unknown>),
                    // Add Shopify-specific metadata from headers
                    _shopify: {
                        topic,
                        shopDomain,
                        webhookId,
                        apiVersion: headers["x-shopify-api-version"]
                    }
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Return 200 to acknowledge receipt (Shopify expects this)
            // Even for errors, return 200 to prevent excessive retries
            return reply.status(response.statusCode === 202 ? 200 : response.statusCode).send({
                received: response.success,
                executionId: response.executionId,
                error: response.error
            });
        }
    );

    /**
     * Legacy Shopify Webhook Route (without triggerId)
     * Route: POST /shopify
     *
     * Kept for backwards compatibility with existing Shopify webhook registrations.
     * New integrations should use /shopify/:triggerId
     */
    fastify.post(
        "/shopify",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const headers = request.headers as ShopifyWebhookHeaders;

            const topic = headers["x-shopify-topic"];
            const shopDomain = headers["x-shopify-shop-domain"];

            logger.info({ topic, shopDomain }, "Received Shopify webhook (legacy route)");

            // For legacy webhooks without triggerId, we need to look up triggers
            // by shop domain and topic. For now, log and acknowledge.
            logger.warn(
                { topic, shopDomain },
                "Legacy Shopify webhook received - no triggerId specified"
            );

            return reply.status(200).send({
                received: true,
                message: "Legacy webhook acknowledged. Please update to use /shopify/:triggerId"
            });
        }
    );

    /**
     * Shopify Webhook Ping Handler
     * Route: GET /shopify/:triggerId
     */
    fastify.get(
        "/shopify/:triggerId",
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;

            logger.info({ triggerId }, "Shopify webhook verification ping");

            return reply.status(200).send({
                success: true,
                message: "Shopify webhook endpoint is active",
                triggerId
            });
        }
    );
}

/**
 * Common Shopify webhook topics:
 *
 * Orders:
 * - orders/create
 * - orders/updated
 * - orders/paid
 * - orders/fulfilled
 * - orders/partially_fulfilled
 * - orders/cancelled
 * - orders/delete
 *
 * Products:
 * - products/create
 * - products/update
 * - products/delete
 *
 * Customers:
 * - customers/create
 * - customers/update
 * - customers/delete
 * - customers/enable
 * - customers/disable
 *
 * Inventory:
 * - inventory_levels/connect
 * - inventory_levels/update
 * - inventory_levels/disconnect
 *
 * Checkouts:
 * - checkouts/create
 * - checkouts/update
 * - checkouts/delete
 *
 * Carts:
 * - carts/create
 * - carts/update
 *
 * Collections:
 * - collections/create
 * - collections/update
 * - collections/delete
 *
 * App:
 * - app/uninstalled
 * - shop/update
 */
