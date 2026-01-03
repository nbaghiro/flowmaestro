/**
 * Stripe Webhook Handler
 *
 * Handles incoming webhooks from Stripe for:
 * - Payment intent events (succeeded, failed, etc.)
 * - Subscription events (created, updated, deleted)
 * - Invoice events (paid, payment_failed, etc.)
 * - Checkout session events
 * - Customer events
 *
 * Signature verification uses Stripe-Signature header with HMAC-SHA256
 * and timestamp validation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { providerWebhookService } from "../../../temporal/core/services/provider-webhook";

const logger = createServiceLogger("StripeWebhook");

interface StripeEventPayload {
    id: string;
    object: "event";
    type: string;
    created: number;
    livemode: boolean;
    pending_webhooks: number;
    request?: {
        id?: string;
        idempotency_key?: string;
    };
    data: {
        object: Record<string, unknown>;
        previous_attributes?: Record<string, unknown>;
    };
    api_version?: string;
    [key: string]: unknown;
}

export async function stripeWebhookRoutes(fastify: FastifyInstance) {
    /**
     * Stripe Webhook Receiver
     * Route: POST /stripe/:triggerId
     */
    fastify.post(
        "/stripe/:triggerId",
        {
            config: {
                rawBody: true // Need raw body for signature verification
            }
        },
        async (request: FastifyRequest<{ Params: { triggerId: string } }>, reply: FastifyReply) => {
            const { triggerId } = request.params;
            const payload = request.body as StripeEventPayload;

            logger.info(
                {
                    triggerId,
                    eventType: payload.type,
                    eventId: payload.id,
                    livemode: payload.livemode
                },
                "Received Stripe webhook"
            );

            // Check for test mode vs live mode
            if (!payload.livemode) {
                logger.debug({ triggerId, eventId: payload.id }, "Stripe webhook in test mode");
            }

            // Get raw body for signature verification
            const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

            // Process through provider webhook service
            const response = await providerWebhookService.processProviderWebhook({
                providerId: "stripe",
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

            // Stripe expects a 200 response for success
            // Return 200 even for errors to prevent Stripe from retrying indefinitely
            // Errors are logged for debugging
            return reply.status(response.statusCode === 202 ? 200 : response.statusCode).send({
                received: response.success,
                executionId: response.executionId,
                error: response.error
            });
        }
    );
}

/**
 * Common Stripe event types that can be used for triggers:
 *
 * Payment Intent:
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - payment_intent.canceled
 * - payment_intent.created
 *
 * Subscription:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - customer.subscription.paused
 * - customer.subscription.resumed
 * - customer.subscription.trial_will_end
 *
 * Invoice:
 * - invoice.paid
 * - invoice.payment_failed
 * - invoice.payment_succeeded
 * - invoice.created
 * - invoice.finalized
 * - invoice.voided
 *
 * Checkout:
 * - checkout.session.completed
 * - checkout.session.async_payment_succeeded
 * - checkout.session.async_payment_failed
 * - checkout.session.expired
 *
 * Customer:
 * - customer.created
 * - customer.updated
 * - customer.deleted
 *
 * Charge:
 * - charge.succeeded
 * - charge.failed
 * - charge.refunded
 * - charge.dispute.created
 */
