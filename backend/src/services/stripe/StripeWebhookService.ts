import Stripe from "stripe";
import { SUBSCRIPTION_PLANS } from "@flowmaestro/shared";
import { createServiceLogger } from "../../core/logging";
import { PaymentHistoryRepository } from "../../storage/repositories/PaymentHistoryRepository";
import { StripeEventRepository } from "../../storage/repositories/StripeEventRepository";
import { WorkspaceRepository } from "../../storage/repositories/WorkspaceRepository";
import { CreditService } from "../workspace/CreditService";
import { stripeService } from "./StripeService";

const logger = createServiceLogger("StripeWebhookService");

export class StripeWebhookService {
    private stripeEventRepo: StripeEventRepository;
    private paymentHistoryRepo: PaymentHistoryRepository;
    private workspaceRepo: WorkspaceRepository;
    private creditService: CreditService;

    constructor() {
        this.stripeEventRepo = new StripeEventRepository();
        this.paymentHistoryRepo = new PaymentHistoryRepository();
        this.workspaceRepo = new WorkspaceRepository();
        this.creditService = new CreditService();
    }

    /**
     * Process a webhook event from Stripe.
     */
    async processEvent(event: Stripe.Event): Promise<void> {
        // Idempotency check
        if (await this.stripeEventRepo.hasProcessed(event.id)) {
            logger.info({ eventId: event.id }, "Event already processed, skipping");
            return;
        }

        logger.info({ eventId: event.id, type: event.type }, "Processing Stripe webhook event");

        try {
            switch (event.type) {
                case "checkout.session.completed":
                    await this.handleCheckoutCompleted(
                        event.data.object as Stripe.Checkout.Session
                    );
                    break;

                case "customer.subscription.created":
                case "customer.subscription.updated":
                    await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                    break;

                case "customer.subscription.deleted":
                    await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                    break;

                case "customer.subscription.trial_will_end":
                    await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
                    break;

                case "invoice.paid":
                    await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
                    break;

                case "invoice.payment_failed":
                    await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                    break;

                default:
                    logger.debug({ eventType: event.type }, "Unhandled event type");
            }

            // Record processed event
            await this.stripeEventRepo.create({
                stripe_event_id: event.id,
                event_type: event.type,
                raw_payload: event as unknown as Record<string, unknown>
            });
        } catch (error) {
            logger.error(
                { eventId: event.id, type: event.type, error },
                "Error processing webhook event"
            );
            throw error;
        }
    }

    /**
     * Handle checkout.session.completed event.
     * This is triggered when a customer completes a checkout session.
     */
    private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const metadata = session.metadata;
        if (!metadata) {
            logger.warn({ sessionId: session.id }, "Checkout session has no metadata");
            return;
        }

        const { workspaceId, userId, type } = metadata;
        if (!workspaceId) {
            logger.warn({ sessionId: session.id }, "Checkout session has no workspaceId");
            return;
        }

        if (type === "subscription") {
            // Subscription checkout - the subscription.created event will handle the rest
            logger.info({ workspaceId, sessionId: session.id }, "Subscription checkout completed");

            // Record payment history
            if (session.amount_total) {
                await this.paymentHistoryRepo.create({
                    workspace_id: workspaceId,
                    user_id: userId,
                    stripe_checkout_session_id: session.id,
                    stripe_subscription_id: session.subscription as string,
                    amount_cents: session.amount_total,
                    currency: session.currency || "usd",
                    status: "succeeded",
                    payment_type: "subscription",
                    description: `Subscription - ${metadata.planSlug} (${metadata.billingInterval})`
                });
            }
        } else if (type === "credit_pack") {
            // Credit pack purchase
            const packId = metadata.packId;
            const credits = parseInt(metadata.credits || "0", 10);

            if (packId && credits > 0) {
                // Add purchased credits
                await this.creditService.addPurchasedCredits(workspaceId, userId, credits, packId);

                // Record payment history
                await this.paymentHistoryRepo.create({
                    workspace_id: workspaceId,
                    user_id: userId,
                    stripe_checkout_session_id: session.id,
                    amount_cents: session.amount_total || 0,
                    currency: session.currency || "usd",
                    status: "succeeded",
                    payment_type: "credit_pack",
                    description: `Credit pack: ${packId} (${credits} credits)`,
                    metadata: { packId, credits }
                });

                logger.info(
                    { workspaceId, packId, credits, sessionId: session.id },
                    "Credit pack purchase completed"
                );
            }
        }
    }

    /**
     * Handle subscription created/updated events.
     */
    private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
        const workspaceId = subscription.metadata?.workspaceId;
        if (!workspaceId) {
            logger.warn(
                { subscriptionId: subscription.id },
                "Subscription has no workspaceId in metadata"
            );
            return;
        }

        // Update workspace subscription details
        await stripeService.updateWorkspaceSubscription(workspaceId, subscription);

        // If this is a new subscription (status is trialing or active) and not past_due,
        // add the initial credits
        const planSlug = stripeService.getPlanSlugFromMetadata(subscription.metadata);
        const status = stripeService.mapSubscriptionStatus(subscription.status);

        if (planSlug && (status === "trialing" || status === "active")) {
            const plan = SUBSCRIPTION_PLANS[planSlug];

            // Check if we should add credits (only on new subscription or period start)
            // We'll handle monthly refresh in invoice.paid
            if (subscription.status === "trialing") {
                // Add trial credits
                const trialEnd = subscription.trial_end
                    ? new Date(subscription.trial_end * 1000)
                    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

                await this.creditService.addSubscriptionCredits(
                    workspaceId,
                    plan.monthlyCredits,
                    trialEnd
                );

                logger.info(
                    { workspaceId, credits: plan.monthlyCredits, trialEnd },
                    "Added trial credits"
                );
            }
        }
    }

    /**
     * Handle subscription deleted event.
     * Downgrade the workspace to free tier.
     */
    private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
        const workspaceId = subscription.metadata?.workspaceId;
        if (!workspaceId) {
            logger.warn(
                { subscriptionId: subscription.id },
                "Deleted subscription has no workspaceId"
            );
            return;
        }

        // Downgrade to free tier
        await stripeService.downgradeWorkspaceToFree(workspaceId);

        logger.info(
            { workspaceId, subscriptionId: subscription.id },
            "Subscription deleted, downgraded to free"
        );
    }

    /**
     * Handle trial_will_end event (3 days before trial ends).
     * Send a reminder email to the user.
     */
    private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
        const workspaceId = subscription.metadata?.workspaceId;
        if (!workspaceId) {
            return;
        }

        const workspace = await this.workspaceRepo.findById(workspaceId);
        if (!workspace) {
            return;
        }

        // TODO: Send trial ending reminder email
        logger.info(
            { workspaceId, subscriptionId: subscription.id, trialEnd: subscription.trial_end },
            "Trial will end soon - should send reminder email"
        );
    }

    /**
     * Handle invoice.paid event.
     * This refreshes monthly credits for recurring subscriptions.
     */
    private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
        // Only process subscription invoices
        // In newer Stripe API, subscription is accessed via parent.subscription_details
        const subscriptionDetails = invoice.parent?.subscription_details;
        if (!subscriptionDetails) {
            return;
        }

        const subscriptionId =
            typeof subscriptionDetails.subscription === "string"
                ? subscriptionDetails.subscription
                : subscriptionDetails.subscription?.id;

        if (!subscriptionId) {
            return;
        }

        const workspace = await this.workspaceRepo.findByStripeSubscriptionId(subscriptionId);
        if (!workspace) {
            logger.warn(
                { subscriptionId, invoiceId: invoice.id },
                "No workspace found for subscription"
            );
            return;
        }

        // Get the subscription to determine the plan
        const subscription = await stripeService.getSubscription(subscriptionId);
        if (!subscription) {
            return;
        }

        const planSlug = stripeService.getPlanSlugFromMetadata(subscription.metadata);
        if (!planSlug) {
            return;
        }

        const plan = SUBSCRIPTION_PLANS[planSlug];
        // Get period end from first subscription item
        const firstItem = subscription.items?.data?.[0];
        const periodEnd = firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : new Date();

        // Skip if this is the first invoice (subscription creation)
        // We already add credits on subscription.created
        if (invoice.billing_reason === "subscription_create") {
            logger.debug(
                { workspaceId: workspace.id, invoiceId: invoice.id },
                "Skipping credit refresh for initial subscription invoice"
            );
            return;
        }

        // Refresh subscription credits
        await this.creditService.addSubscriptionCredits(
            workspace.id,
            plan.monthlyCredits,
            periodEnd
        );

        // Update workspace subscription status
        await stripeService.updateWorkspaceSubscription(workspace.id, subscription);

        // Record payment history
        await this.paymentHistoryRepo.create({
            workspace_id: workspace.id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: "succeeded",
            payment_type: "subscription",
            description: `Monthly subscription renewal - ${planSlug}`
        });

        logger.info(
            { workspaceId: workspace.id, planSlug, credits: plan.monthlyCredits, periodEnd },
            "Monthly credits refreshed"
        );
    }

    /**
     * Handle invoice.payment_failed event.
     * Update subscription status to past_due.
     */
    private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        // In newer Stripe API, subscription is accessed via parent.subscription_details
        const subscriptionDetails = invoice.parent?.subscription_details;
        if (!subscriptionDetails) {
            return;
        }

        const subscriptionId =
            typeof subscriptionDetails.subscription === "string"
                ? subscriptionDetails.subscription
                : subscriptionDetails.subscription?.id;

        if (!subscriptionId) {
            return;
        }

        const workspace = await this.workspaceRepo.findByStripeSubscriptionId(subscriptionId);
        if (!workspace) {
            return;
        }

        // Update workspace subscription status
        await this.workspaceRepo.update(workspace.id, {
            subscription_status: "past_due"
        });

        // Record payment history
        await this.paymentHistoryRepo.create({
            workspace_id: workspace.id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            amount_cents: invoice.amount_due,
            currency: invoice.currency,
            status: "failed",
            payment_type: "subscription",
            description: "Subscription payment failed"
        });

        logger.warn(
            { workspaceId: workspace.id, subscriptionId, invoiceId: invoice.id },
            "Subscription payment failed"
        );

        // TODO: Send payment failed email
    }
}

// Singleton instance
export const stripeWebhookService = new StripeWebhookService();
