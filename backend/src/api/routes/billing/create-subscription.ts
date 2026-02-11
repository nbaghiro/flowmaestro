import { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { z } from "zod";
import { config } from "../../../core/config";
import { createServiceLogger } from "../../../core/logging";
import { stripeService } from "../../../services/stripe";
import { WorkspaceRepository } from "../../../storage/repositories/WorkspaceRepository";
import { authMiddleware, workspaceContextMiddleware, requirePermission } from "../../middleware";

const logger = createServiceLogger("BillingCreateSubscriptionRoute");

const createSubscriptionSchema = z.object({
    planSlug: z.enum(["pro", "team"]),
    billingInterval: z.enum(["monthly", "annual"])
});

export async function createSubscriptionRoute(fastify: FastifyInstance) {
    /**
     * POST /billing/create-subscription
     *
     * Creates a subscription with payment_behavior='default_incomplete'.
     * Returns the client_secret for the PaymentElement to collect payment.
     *
     * This is the embedded checkout flow - no redirect to Stripe.
     */
    fastify.post<{
        Querystring: { workspaceId: string };
        Body: z.infer<typeof createSubscriptionSchema>;
    }>(
        "/create-subscription",
        {
            preHandler: [authMiddleware, workspaceContextMiddleware, requirePermission("upgrade")]
        },
        async (request, reply) => {
            const workspaceId = request.workspace!.id;
            const userId = request.user!.id;
            const userEmail = request.user!.email;

            try {
                const body = createSubscriptionSchema.parse(request.body);

                // Check if workspace already has an active subscription
                const workspaceRepo = new WorkspaceRepository();
                const workspace = await workspaceRepo.findById(workspaceId);

                if (
                    workspace?.subscription_status === "active" ||
                    workspace?.subscription_status === "trialing"
                ) {
                    return reply.status(400).send({
                        success: false,
                        error: "Workspace already has an active subscription. Use the billing portal to change plans."
                    });
                }

                // Get or create Stripe customer
                const customerId = await stripeService.getOrCreateCustomer(userId, userEmail);

                // Get the price ID
                const priceId = getSubscriptionPriceId(body.planSlug, body.billingInterval);
                if (!priceId) {
                    return reply.status(400).send({
                        success: false,
                        error: `Price not configured for ${body.planSlug} ${body.billingInterval}`
                    });
                }

                // Create Stripe instance
                const stripe = new Stripe(config.stripe?.secretKey || "");

                // Get trial days from plan
                const trialDays = body.planSlug === "pro" || body.planSlug === "team" ? 14 : 0;

                // Create the subscription with incomplete status
                // This allows us to collect payment via PaymentElement
                const subscription = await stripe.subscriptions.create({
                    customer: customerId,
                    items: [{ price: priceId }],
                    payment_behavior: "default_incomplete",
                    payment_settings: {
                        save_default_payment_method: "on_subscription"
                    },
                    expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
                    trial_period_days: trialDays > 0 ? trialDays : undefined,
                    metadata: {
                        workspaceId,
                        planSlug: body.planSlug,
                        userId
                    }
                });

                // For trials, we use SetupIntent (no charge yet)
                // For immediate payments, we use PaymentIntent
                let clientSecret: string;
                let intentType: "setup" | "payment";

                if (trialDays > 0 && subscription.pending_setup_intent) {
                    // Trial subscription - use SetupIntent to save payment method
                    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent;
                    clientSecret = setupIntent.client_secret!;
                    intentType = "setup";
                } else {
                    // No trial - use PaymentIntent from the invoice
                    // When expanded, latest_invoice contains the full invoice object
                    // and payment_intent is accessed via the expanded field
                    const invoice = subscription.latest_invoice as Stripe.Invoice & {
                        payment_intent: Stripe.PaymentIntent | null;
                    };
                    if (!invoice.payment_intent) {
                        throw new Error("Failed to create payment intent for subscription");
                    }
                    clientSecret = invoice.payment_intent.client_secret!;
                    intentType = "payment";
                }

                logger.info(
                    {
                        workspaceId,
                        userId,
                        planSlug: body.planSlug,
                        subscriptionId: subscription.id,
                        intentType
                    },
                    "Created subscription for embedded checkout"
                );

                return reply.send({
                    success: true,
                    data: {
                        subscriptionId: subscription.id,
                        clientSecret,
                        intentType,
                        trialDays,
                        customerId
                    }
                });
            } catch (error) {
                logger.error(
                    { workspaceId, userId, error },
                    "Error creating subscription for embedded checkout"
                );

                if (error instanceof z.ZodError) {
                    return reply.status(400).send({
                        success: false,
                        error: "Invalid request body",
                        details: error.errors
                    });
                }

                return reply.status(500).send({
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to create subscription"
                });
            }
        }
    );
}

function getSubscriptionPriceId(
    planSlug: "pro" | "team",
    interval: "monthly" | "annual"
): string | null {
    const priceIds = config.stripe?.priceIds;
    if (!priceIds) {
        return null;
    }

    if (planSlug === "pro") {
        return interval === "monthly" ? priceIds.proMonthly : priceIds.proAnnual;
    } else {
        return interval === "monthly" ? priceIds.teamMonthly : priceIds.teamAnnual;
    }
}
