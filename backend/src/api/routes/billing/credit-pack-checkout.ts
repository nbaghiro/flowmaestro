import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createServiceLogger } from "../../../core/logging";
import { stripeService } from "../../../services/stripe";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("BillingCreditPackRoute");

const creditPackSchema = z.object({
    packId: z.string(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url()
});

export async function creditPackCheckoutRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/purchase-credits
     *
     * Create a Stripe checkout session for a credit pack purchase.
     */
    fastify.post<{
        Querystring: { workspaceId: string };
        Body: z.infer<typeof creditPackSchema>;
    }>(
        "/purchase-credits",
        {
            preHandler: [
                authMiddleware,
                workspaceContextMiddleware,
                requirePermission("manage_billing")
            ]
        },
        async (request, reply) => {
            const workspaceId = request.workspace!.id;
            const userId = request.user!.id;
            const userEmail = request.user!.email;

            try {
                const body = creditPackSchema.parse(request.body);

                const { sessionId, checkoutUrl } = await stripeService.createCreditPackCheckout(
                    workspaceId,
                    userId,
                    userEmail,
                    body.packId,
                    body.successUrl,
                    body.cancelUrl
                );

                logger.info(
                    { workspaceId, userId, packId: body.packId, sessionId },
                    "Created credit pack checkout session"
                );

                return reply.send({
                    success: true,
                    data: {
                        sessionId,
                        checkoutUrl
                    }
                });
            } catch (error) {
                logger.error({ workspaceId, userId, error }, "Error creating credit pack checkout");

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
