import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { stripeService } from "../../../services/stripe";
import { authMiddleware } from "../../middleware";

const logger = createServiceLogger("BillingPortalRoute");

const portalSchema = z.object({
    returnUrl: z.string().url()
});

export async function portalRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/portal
     *
     * Create a Stripe billing portal session for managing subscription.
     */
    fastify.post<{
        Body: z.infer<typeof portalSchema>;
    }>(
        "/portal",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userId = request.user!.id;

            try {
                const body = portalSchema.parse(request.body);

                const { portalUrl } = await stripeService.createPortalSession(
                    userId,
                    body.returnUrl
                );

                logger.info({ userId }, "Created billing portal session");

                return reply.send({
                    success: true,
                    data: {
                        portalUrl
                    }
                });
            } catch (error) {
                logger.error({ userId, error }, "Error creating portal session");

                if (error instanceof z.ZodError) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid request body",
                        details: error.errors
                    });
                }

                if (error instanceof Error && error.message.includes("No Stripe customer")) {
                    return reply.status(404).send({
                        success: false,
                        error: "No billing account found. Please subscribe to a plan first."
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error:
                        error instanceof Error ? error.message : "Failed to create portal session"
                });
            }
        }
    );
}
