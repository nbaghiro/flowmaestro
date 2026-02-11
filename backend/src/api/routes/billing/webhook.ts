import { FastifyInstance, FastifyRequest } from "fastify";
import { createServiceLogger } from "../../../core/logging";
import { stripeService, stripeWebhookService } from "../../../services/stripe";

const logger = createServiceLogger("StripeWebhookRoute");

export async function webhookRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/webhook
     *
     * Stripe webhook endpoint.
     * This route does NOT use auth middleware - it uses Stripe signature verification.
     */
    fastify.post(
        "/webhook",
        {
            // Use raw body for signature verification
            config: {
                rawBody: true
            }
        },
        async (request: FastifyRequest, reply) => {
            const signature = request.headers["stripe-signature"];

            if (!signature) {
                return reply.status(400).send({
                    success: false,
                    error: "Missing Stripe signature"
                });
            }

            try {
                // Get raw body for signature verification
                // Fastify with rawBody config stores it in request.rawBody
                const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;
                if (!rawBody) {
                    logger.error("Raw body not available for webhook signature verification");
                    return reply.status(400).send({
                        success: false,
                        error: "Unable to verify webhook signature"
                    });
                }

                // Verify webhook signature and construct event
                const event = stripeService.constructWebhookEvent(rawBody, signature as string);

                // Process the event
                await stripeWebhookService.processEvent(event);

                return reply.status(200).send({ received: true });
            } catch (error) {
                logger.error({ error }, "Webhook error");

                if (error instanceof Error && error.message.includes("signature")) {
                    return reply.status(400).send({
                        success: false,
                        error: "Webhook signature verification failed"
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: "Webhook processing failed"
                });
            }
        }
    );
}
