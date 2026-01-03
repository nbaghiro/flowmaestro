/**
 * Meta Platform Webhook Handler
 *
 * Handles incoming webhooks from Meta services:
 * - WhatsApp Business (messages, status updates)
 * - Instagram (messages, comments, mentions)
 * - Facebook Messenger (messages, postbacks)
 * - Facebook Page (comments, feed updates)
 *
 * Signature verification uses X-Hub-Signature-256 header with HMAC-SHA256
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { FacebookWebhookHandler } from "../../../integrations/providers/facebook/webhooks/FacebookWebhookHandler";
import { InstagramWebhookHandler } from "../../../integrations/providers/instagram/webhooks/InstagramWebhookHandler";
import { WhatsAppWebhookHandler } from "../../../integrations/providers/whatsapp/webhooks/WhatsAppWebhookHandler";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";
import type { MessengerWebhookPayload } from "../../../integrations/providers/facebook/types";
import type { InstagramWebhookPayload } from "../../../integrations/providers/instagram/types";
import type { WhatsAppWebhookPayload } from "../../../integrations/providers/whatsapp/types";

const logger = createServiceLogger("MetaWebhook");

// Meta object types
const META_OBJECT_TYPES = {
    WHATSAPP: "whatsapp_business_account",
    INSTAGRAM: "instagram",
    PAGE: "page" // Facebook Page/Messenger
};

export async function metaWebhookRoutes(fastify: FastifyInstance) {
    // Initialize handlers for legacy routes
    const whatsappHandler = new WhatsAppWebhookHandler();
    const instagramHandler = new InstagramWebhookHandler();
    const facebookHandler = new FacebookWebhookHandler();

    /**
     * Meta Webhook Verification (GET)
     * Routes: GET /meta, GET /whatsapp/:triggerId, GET /instagram/:triggerId, GET /facebook/:triggerId
     *
     * Meta sends a verification request when setting up webhooks.
     * We must respond with the hub.challenge value to verify ownership.
     */
    const verificationHandler = async (
        request: FastifyRequest<{ Params: { triggerId?: string } }>,
        reply: FastifyReply
    ) => {
        const query = request.query as {
            "hub.mode"?: string;
            "hub.verify_token"?: string;
            "hub.challenge"?: string;
        };

        const mode = query["hub.mode"];
        const token = query["hub.verify_token"];
        const challenge = query["hub.challenge"];
        const triggerId = request.params?.triggerId;

        logger.info({ mode, triggerId }, "Meta webhook verification request");

        // Get verify token from config
        const verifyToken = config.oauth.meta.webhookVerifyToken;

        if (!verifyToken) {
            logger.error("META_WEBHOOK_VERIFY_TOKEN not configured");
            return reply.status(500).send("Server configuration error");
        }

        // Check if this is a verification request
        if (mode === "subscribe" && token === verifyToken) {
            logger.info({ triggerId }, "Meta webhook verification successful");
            return reply.status(200).send(challenge);
        }

        logger.warn({ triggerId }, "Meta webhook verification failed: invalid token");
        return reply.status(403).send("Forbidden");
    };

    // Register verification routes
    fastify.get("/meta", verificationHandler);
    fastify.get("/whatsapp/:triggerId", verificationHandler);
    fastify.get("/instagram/:triggerId", verificationHandler);
    fastify.get("/facebook/:triggerId", verificationHandler);

    /**
     * WhatsApp Webhook Receiver
     * Route: POST /whatsapp/:triggerId
     */
    fastify.post(
        "/whatsapp/:triggerId",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as WhatsAppWebhookPayload;

            logger.info({ triggerId, object: payload.object }, "Received WhatsApp webhook");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "whatsapp",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    eventType: extractWhatsAppEventType(payload)
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Meta expects 200 response
            return reply.status(200).send({
                success: response.success,
                executionId: response.executionId
            });
        }
    );

    /**
     * Instagram Webhook Receiver
     * Route: POST /instagram/:triggerId
     */
    fastify.post(
        "/instagram/:triggerId",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as InstagramWebhookPayload;

            logger.info({ triggerId, object: payload.object }, "Received Instagram webhook");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "instagram",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    eventType: extractInstagramEventType(payload)
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Meta expects 200 response
            return reply.status(200).send({
                success: response.success,
                executionId: response.executionId
            });
        }
    );

    /**
     * Facebook Webhook Receiver
     * Route: POST /facebook/:triggerId
     */
    fastify.post(
        "/facebook/:triggerId",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as MessengerWebhookPayload;

            logger.info({ triggerId, object: payload.object }, "Received Facebook webhook");

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "facebook",
                triggerId,
                headers: request.headers as Record<string, string | string[] | undefined>,
                body: {
                    ...payload,
                    eventType: extractFacebookEventType(payload)
                },
                rawBody,
                query: request.query as Record<string, unknown>,
                method: request.method,
                path: request.url,
                ip: request.ip,
                userAgent: request.headers["user-agent"] as string
            });

            // Meta expects 200 response
            return reply.status(200).send({
                success: response.success,
                executionId: response.executionId
            });
        }
    );

    /**
     * Legacy Meta Webhook (POST)
     * Route: POST /meta
     *
     * Receives webhook events from Meta platform and routes to appropriate handlers.
     * Kept for backwards compatibility.
     */
    fastify.post(
        "/meta",
        {
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const payload = request.body as { object?: string };

            logger.info({ object: payload.object }, "Received Meta webhook (legacy route)");

            // Route to appropriate handler based on object type
            try {
                switch (payload.object) {
                    case META_OBJECT_TYPES.WHATSAPP:
                        await whatsappHandler.handleWebhook(
                            payload as WhatsAppWebhookPayload,
                            fastify.log
                        );
                        break;

                    case META_OBJECT_TYPES.INSTAGRAM:
                        await instagramHandler.handleWebhook(
                            payload as InstagramWebhookPayload,
                            fastify.log
                        );
                        break;

                    case META_OBJECT_TYPES.PAGE:
                        await facebookHandler.handleWebhook(
                            payload as MessengerWebhookPayload,
                            fastify.log
                        );
                        break;

                    default:
                        logger.warn({ object: payload.object }, "Unknown Meta object type");
                }

                // Always return 200 to acknowledge receipt
                return reply.status(200).send({ success: true });
            } catch (error) {
                logger.error({ error }, "Error processing Meta webhook");
                // Still return 200 to prevent Meta from retrying
                return reply.status(200).send({ success: true });
            }
        }
    );
}

/**
 * Extract WhatsApp event type from webhook payload
 */
function extractWhatsAppEventType(payload: WhatsAppWebhookPayload): string {
    if (!payload.entry?.[0]?.changes?.[0]) {
        return "unknown";
    }

    const change = payload.entry[0].changes[0];
    const field = change.field;

    if (field === "messages") {
        const value = change.value as { messages?: Array<{ type?: string }> };
        if (value?.messages?.[0]) {
            const messageType = value.messages[0].type;
            return `message:${messageType || "text"}`;
        }
        // Could be a status update
        return "message:status";
    }

    return field || "unknown";
}

/**
 * Extract Instagram event type from webhook payload
 */
function extractInstagramEventType(payload: InstagramWebhookPayload): string {
    if (!payload.entry?.[0]) {
        return "unknown";
    }

    const entry = payload.entry[0] as {
        messaging?: unknown[];
        changes?: Array<{ field?: string }>;
    };

    if (entry.messaging) {
        return "message";
    }

    if (entry.changes?.[0]) {
        const field = entry.changes[0].field;
        return field || "unknown";
    }

    return "unknown";
}

/**
 * Extract Facebook event type from webhook payload
 */
function extractFacebookEventType(payload: MessengerWebhookPayload): string {
    if (!payload.entry?.[0]) {
        return "unknown";
    }

    const entry = payload.entry[0] as {
        messaging?: Array<{
            message?: unknown;
            postback?: unknown;
            referral?: unknown;
        }>;
        changes?: Array<{ field?: string }>;
    };

    if (entry.messaging?.[0]) {
        const messaging = entry.messaging[0];
        if (messaging.message) {
            return "message";
        }
        if (messaging.postback) {
            return "postback";
        }
        if (messaging.referral) {
            return "referral";
        }
    }

    if (entry.changes?.[0]) {
        const field = entry.changes[0].field;
        return field || "unknown";
    }

    return "unknown";
}

/**
 * Meta Webhook Events:
 *
 * WhatsApp Business:
 * - messages - Incoming messages (text, image, document, etc.)
 * - message_status - Message delivery/read status
 * - message_template_status_update - Template status changes
 *
 * Instagram:
 * - messages - Direct messages
 * - messaging_postbacks - Button clicks
 * - comments - Comments on posts
 * - mentions - @mentions in posts/stories
 * - story_insights - Story view metrics
 *
 * Facebook Page/Messenger:
 * - messages - Incoming messages
 * - messaging_postbacks - Button/quick reply clicks
 * - messaging_referrals - Referral from ads, links
 * - feed - Page feed changes (posts, comments)
 * - mention - Page mentions
 * - ratings - Page ratings/reviews
 */
