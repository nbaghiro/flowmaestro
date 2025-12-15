import * as crypto from "crypto";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../../core/config";
import { FacebookWebhookHandler } from "../../../integrations/providers/facebook/webhooks/FacebookWebhookHandler";
import { InstagramWebhookHandler } from "../../../integrations/providers/instagram/webhooks/InstagramWebhookHandler";
import { WhatsAppWebhookHandler } from "../../../integrations/providers/whatsapp/webhooks/WhatsAppWebhookHandler";
import type { MessengerWebhookPayload } from "../../../integrations/providers/facebook/types";
import type { InstagramWebhookPayload } from "../../../integrations/providers/instagram/types";
import type { WhatsAppWebhookPayload } from "../../../integrations/providers/whatsapp/types";

/**
 * Meta Platform Webhook Routes
 *
 * Handles webhooks from Meta services (WhatsApp, Instagram, Messenger, Facebook)
 * All Meta services use the same endpoint with different object types.
 */
export async function metaWebhookRoutes(fastify: FastifyInstance) {
    const whatsappHandler = new WhatsAppWebhookHandler();
    const instagramHandler = new InstagramWebhookHandler();
    const facebookHandler = new FacebookWebhookHandler();

    /**
     * Webhook Verification (GET)
     *
     * Meta sends a verification request when setting up webhooks.
     * We must respond with the hub.challenge value to verify ownership.
     */
    fastify.get("/meta", async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as {
            "hub.mode"?: string;
            "hub.verify_token"?: string;
            "hub.challenge"?: string;
        };

        const mode = query["hub.mode"];
        const token = query["hub.verify_token"];
        const challenge = query["hub.challenge"];

        fastify.log.info(`[MetaWebhook] Verification request: mode=${mode}`);

        // Get verify token from config
        const verifyToken = config.oauth.meta.webhookVerifyToken;

        if (!verifyToken) {
            fastify.log.error("[MetaWebhook] META_WEBHOOK_VERIFY_TOKEN not configured");
            return reply.status(500).send("Server configuration error");
        }

        // Check if this is a verification request
        if (mode === "subscribe" && token === verifyToken) {
            fastify.log.info("[MetaWebhook] Verification successful");
            return reply.status(200).send(challenge);
        }

        fastify.log.warn("[MetaWebhook] Verification failed: invalid token");
        return reply.status(403).send("Forbidden");
    });

    /**
     * Webhook Events (POST)
     *
     * Receives webhook events from Meta platform.
     * Events are routed to appropriate handlers based on the object type.
     */
    fastify.post(
        "/meta",
        {
            config: {
                rawBody: true // Need raw body for signature verification
            }
        },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const signature = request.headers["x-hub-signature-256"] as string;

            // Verify signature
            if (!verifySignature(request, signature)) {
                fastify.log.warn("[MetaWebhook] Invalid signature");
                return reply.status(401).send({ error: "Invalid signature" });
            }

            const payload = request.body as { object?: string };

            fastify.log.info(`[MetaWebhook] Received webhook: object=${payload.object}`);

            // Route to appropriate handler based on object type
            try {
                switch (payload.object) {
                    case "whatsapp_business_account":
                        await whatsappHandler.handleWebhook(
                            payload as WhatsAppWebhookPayload,
                            fastify.log
                        );
                        break;

                    case "instagram":
                        await instagramHandler.handleWebhook(
                            payload as InstagramWebhookPayload,
                            fastify.log
                        );
                        break;

                    case "page":
                        await facebookHandler.handleWebhook(
                            payload as MessengerWebhookPayload,
                            fastify.log
                        );
                        break;

                    default:
                        fastify.log.warn(`[MetaWebhook] Unknown object type: ${payload.object}`);
                }

                // Always return 200 to acknowledge receipt
                // Meta will retry if we don't respond with 200 quickly
                return reply.status(200).send({ success: true });
            } catch (error) {
                fastify.log.error(`[MetaWebhook] Error processing webhook: ${error}`);
                // Still return 200 to prevent Meta from retrying
                // Errors are logged and can be handled asynchronously
                return reply.status(200).send({ success: true });
            }
        }
    );
}

/**
 * Verify Meta webhook signature
 */
function verifySignature(request: FastifyRequest, signature: string | undefined): boolean {
    if (!signature) {
        return false;
    }

    const appSecret = config.oauth.meta.appSecret;
    if (!appSecret) {
        console.error("[MetaWebhook] META_APP_SECRET not configured");
        return false;
    }

    try {
        // Get raw body from request
        const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
        if (!rawBody) {
            // Fall back to stringified body if rawBody not available
            const bodyString = JSON.stringify(request.body);
            const expectedSignature =
                "sha256=" + crypto.createHmac("sha256", appSecret).update(bodyString).digest("hex");
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        }

        const expectedSignature =
            "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
        console.error("[MetaWebhook] Signature verification error:", error);
        return false;
    }
}
