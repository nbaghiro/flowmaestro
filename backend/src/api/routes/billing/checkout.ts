import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { stripeService } from "../../../services/stripe";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("BillingCheckoutRoute");

const checkoutSchema = z.object({
    planSlug: z.enum(["pro", "team"]),
    billingInterval: z.enum(["monthly", "annual"]),
    successUrl: z.string().url(),
    cancelUrl: z.string().url()
});

export async function checkoutRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/checkout
     *
     * Create a Stripe checkout session for subscription.
     */
    fastify.post<{
        Querystring: { workspaceId: string };
        Body: z.infer<typeof checkoutSchema>;
    }>(
        "/checkout",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("upgrade")]
        },
        async (request, reply) => {
            const workspaceId = request.workspace!.id;
            const userId = request.user!.id;
            const userEmail = request.user!.email;

            try {
                const body = checkoutSchema.parse(request.body);

                const { sessionId, checkoutUrl } = await stripeService.createSubscriptionCheckout(
                    workspaceId,
                    userId,
                    userEmail,
                    body.planSlug,
                    body.billingInterval,
                    body.successUrl,
                    body.cancelUrl
                );

                logger.info(
                    { workspaceId, userId, planSlug: body.planSlug, sessionId },
                    "Created subscription checkout session"
                );

                return reply.send({
                    success: true,
                    data: {
                        sessionId,
                        checkoutUrl
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, userId, error }, "Error creating checkout session");

                if (error instanceof z.ZodError) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid request body",
                        details: error.errors
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error:
                        error instanceof Error ? error.message : "Failed to create checkout session"
                });
            }
        }
    );
}
