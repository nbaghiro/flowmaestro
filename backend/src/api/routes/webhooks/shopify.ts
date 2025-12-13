import * as crypto from "crypto";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Shopify Webhook Payload Header Types
 */
interface ShopifyWebhookHeaders {
    "x-shopify-hmac-sha256"?: string;
    "x-shopify-topic"?: string;
    "x-shopify-shop-domain"?: string;
    "x-shopify-api-version"?: string;
    "x-shopify-webhook-id"?: string;
}

/**
 * Shopify Webhook Payload (generic structure)
 */
interface ShopifyWebhookPayload {
    id?: number;
    [key: string]: unknown;
}

/**
 * Shopify Webhook Routes
 *
 * Handles incoming webhooks from Shopify stores.
 * All webhook events are validated using HMAC-SHA256 signature.
 */
export async function shopifyWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Webhook Events (POST)
     *
     * Receives webhook events from Shopify.
     * Events are validated via HMAC and then processed.
     */
    fastify.post(
        "/shopify",
        {
            config: {
                rawBody: true // Need raw body for HMAC signature verification
            }
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const headers = request.headers as ShopifyWebhookHeaders;

            // Get required headers
            const hmacHeader = headers["x-shopify-hmac-sha256"];
            const topic = headers["x-shopify-topic"];
            const shopDomain = headers["x-shopify-shop-domain"];
            const webhookId = headers["x-shopify-webhook-id"];

            fastify.log.info(
                `[ShopifyWebhook] Received webhook: topic=${topic}, shop=${shopDomain}, id=${webhookId}`
            );

            // Verify HMAC signature
            if (!verifyShopifyHmac(request, hmacHeader)) {
                fastify.log.warn("[ShopifyWebhook] Invalid HMAC signature");
                return reply.status(401).send({ error: "Invalid signature" });
            }

            const payload = request.body as ShopifyWebhookPayload;

            try {
                // Process webhook based on topic
                await processShopifyWebhook({
                    topic: topic || "unknown",
                    shop: shopDomain || "unknown",
                    webhookId: webhookId || "unknown",
                    payload,
                    logger: fastify.log
                });

                // Return 200 to acknowledge receipt
                return reply.status(200).send({ received: true });
            } catch (error) {
                fastify.log.error(`[ShopifyWebhook] Error processing webhook: ${error}`);
                // Still return 200 to prevent Shopify from retrying
                // Errors are logged and can be handled asynchronously
                return reply.status(200).send({ received: true });
            }
        }
    );
}

/**
 * Verify Shopify webhook HMAC signature
 *
 * Shopify signs webhooks using HMAC-SHA256 with the app's client secret.
 * The signature is base64 encoded and sent in the X-Shopify-Hmac-Sha256 header.
 */
function verifyShopifyHmac(request: FastifyRequest, hmacHeader: string | undefined): boolean {
    if (!hmacHeader) {
        console.error("[ShopifyWebhook] Missing HMAC header");
        return false;
    }

    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!clientSecret) {
        console.error("[ShopifyWebhook] SHOPIFY_CLIENT_SECRET not configured");
        return false;
    }

    try {
        // Get raw body from request
        const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
        if (!rawBody) {
            // Fall back to stringified body if rawBody not available
            const bodyString = JSON.stringify(request.body);
            const calculatedHmac = crypto
                .createHmac("sha256", clientSecret)
                .update(bodyString, "utf8")
                .digest("base64");

            return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(calculatedHmac));
        }

        // Calculate HMAC from raw body
        const calculatedHmac = crypto
            .createHmac("sha256", clientSecret)
            .update(rawBody)
            .digest("base64");

        return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(calculatedHmac));
    } catch (error) {
        console.error("[ShopifyWebhook] HMAC verification error:", error);
        return false;
    }
}

/**
 * Process Shopify webhook event
 *
 * This is where you would integrate with the workflow engine
 * to trigger workflows based on webhook events.
 */
async function processShopifyWebhook(event: {
    topic: string;
    shop: string;
    webhookId: string;
    payload: ShopifyWebhookPayload;
    logger: FastifyInstance["log"];
}): Promise<void> {
    const { topic, shop, webhookId, payload, logger } = event;

    logger.info(`[ShopifyWebhook] Processing event: topic=${topic}, shop=${shop}, id=${webhookId}`);

    // Route to specific handlers based on topic
    switch (topic) {
        // Order events
        case "orders/create":
            logger.info(`[ShopifyWebhook] New order created: ${payload.id}`);
            // TODO: Trigger order creation workflow
            break;

        case "orders/updated":
            logger.info(`[ShopifyWebhook] Order updated: ${payload.id}`);
            // TODO: Trigger order update workflow
            break;

        case "orders/paid":
            logger.info(`[ShopifyWebhook] Order paid: ${payload.id}`);
            // TODO: Trigger order payment workflow
            break;

        case "orders/fulfilled":
            logger.info(`[ShopifyWebhook] Order fulfilled: ${payload.id}`);
            // TODO: Trigger order fulfillment workflow
            break;

        case "orders/cancelled":
            logger.info(`[ShopifyWebhook] Order cancelled: ${payload.id}`);
            // TODO: Trigger order cancellation workflow
            break;

        // Product events
        case "products/create":
            logger.info(`[ShopifyWebhook] Product created: ${payload.id}`);
            // TODO: Trigger product creation workflow
            break;

        case "products/update":
            logger.info(`[ShopifyWebhook] Product updated: ${payload.id}`);
            // TODO: Trigger product update workflow
            break;

        case "products/delete":
            logger.info(`[ShopifyWebhook] Product deleted: ${payload.id}`);
            // TODO: Trigger product deletion workflow
            break;

        // Inventory events
        case "inventory_levels/update":
            logger.info("[ShopifyWebhook] Inventory updated");
            // TODO: Trigger inventory update workflow (e.g., low stock alerts)
            break;

        // Customer events
        case "customers/create":
            logger.info(`[ShopifyWebhook] Customer created: ${payload.id}`);
            // TODO: Trigger customer creation workflow
            break;

        case "customers/update":
            logger.info(`[ShopifyWebhook] Customer updated: ${payload.id}`);
            // TODO: Trigger customer update workflow
            break;

        // App events
        case "app/uninstalled":
            logger.warn(`[ShopifyWebhook] App uninstalled from shop: ${shop}`);
            // TODO: Clean up connections and data for this shop
            break;

        case "shop/update":
            logger.info(`[ShopifyWebhook] Shop settings updated: ${shop}`);
            break;

        default:
            logger.info(`[ShopifyWebhook] Unhandled topic: ${topic}`);
    }

    // In a full implementation, you would:
    // 1. Look up connections for this shop
    // 2. Find workflows triggered by this event type
    // 3. Queue workflow executions with the webhook payload
}
