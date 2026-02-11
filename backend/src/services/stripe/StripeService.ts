import Stripe from "stripe";
import type { WorkspaceType, SubscriptionStatus } from "@flowmaestro/shared";
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, WORKSPACE_LIMITS } from "@flowmaestro/shared";
import { config } from "../../core/config";
import { createServiceLogger } from "../../core/logging";
import { UserRepository } from "../../storage/repositories/UserRepository";
import { WorkspaceRepository } from "../../storage/repositories/WorkspaceRepository";

const logger = createServiceLogger("StripeService");

// Stripe price IDs - these should be set in environment variables after creating products in Stripe
interface StripePriceIds {
    proMonthly: string;
    proAnnual: string;
    teamMonthly: string;
    teamAnnual: string;
}

// Credit pack price IDs
interface CreditPackPriceIds {
    starter: string;
    growth: string;
    scale: string;
    enterprise: string;
}

export class StripeService {
    private stripe: Stripe;
    private userRepo: UserRepository;
    private workspaceRepo: WorkspaceRepository;

    constructor() {
        const secretKey = config.stripe?.secretKey;
        if (!secretKey) {
            logger.warn("Stripe secret key not configured");
        }

        // Let Stripe SDK use its default API version
        this.stripe = new Stripe(secretKey || "sk_test_placeholder");

        this.userRepo = new UserRepository();
        this.workspaceRepo = new WorkspaceRepository();
    }

    /**
     * Get or create a Stripe customer for a user.
     */
    async getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // Return existing customer ID if present
        if (user.stripe_customer_id) {
            return user.stripe_customer_id;
        }

        // Create new Stripe customer
        const customer = await this.stripe.customers.create({
            email,
            name: name || undefined,
            metadata: {
                userId
            }
        });

        // Update user with Stripe customer ID
        await this.userRepo.update(userId, {
            stripe_customer_id: customer.id
        });

        logger.info({ userId, customerId: customer.id }, "Created Stripe customer");

        return customer.id;
    }

    /**
     * Create a checkout session for a subscription.
     */
    async createSubscriptionCheckout(
        workspaceId: string,
        userId: string,
        userEmail: string,
        planSlug: "pro" | "team",
        billingInterval: "monthly" | "annual",
        successUrl: string,
        cancelUrl: string
    ): Promise<{ sessionId: string; checkoutUrl: string }> {
        // Get or create customer
        const customerId = await this.getOrCreateCustomer(userId, userEmail);

        // Get price ID based on plan and interval
        const priceId = this.getSubscriptionPriceId(planSlug, billingInterval);
        if (!priceId) {
            throw new Error(`Price not configured for ${planSlug} ${billingInterval}`);
        }

        const plan = SUBSCRIPTION_PLANS[planSlug];

        // Create checkout session
        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            subscription_data: {
                trial_period_days: plan.trialDays > 0 ? plan.trialDays : undefined,
                metadata: {
                    workspaceId,
                    planSlug
                }
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                workspaceId,
                userId,
                planSlug,
                billingInterval,
                type: "subscription"
            }
        });

        logger.info(
            { workspaceId, userId, planSlug, sessionId: session.id },
            "Created subscription checkout session"
        );

        return {
            sessionId: session.id,
            checkoutUrl: session.url!
        };
    }

    /**
     * Create a checkout session for a credit pack purchase.
     */
    async createCreditPackCheckout(
        workspaceId: string,
        userId: string,
        userEmail: string,
        packId: string,
        successUrl: string,
        cancelUrl: string
    ): Promise<{ sessionId: string; checkoutUrl: string }> {
        // Validate pack exists
        const pack = CREDIT_PACKS.find((p) => p.id === packId);
        if (!pack) {
            throw new Error(`Invalid credit pack: ${packId}`);
        }

        // Get or create customer
        const customerId = await this.getOrCreateCustomer(userId, userEmail);

        // Get price ID for the pack
        const priceId = this.getCreditPackPriceId(packId);
        if (!priceId) {
            throw new Error(`Price not configured for credit pack: ${packId}`);
        }

        // Create checkout session
        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                workspaceId,
                userId,
                packId,
                credits: pack.credits.toString(),
                type: "credit_pack"
            }
        });

        logger.info(
            { workspaceId, userId, packId, sessionId: session.id },
            "Created credit pack checkout session"
        );

        return {
            sessionId: session.id,
            checkoutUrl: session.url!
        };
    }

    /**
     * Create a billing portal session for customers to manage their subscription.
     */
    async createPortalSession(userId: string, returnUrl: string): Promise<{ portalUrl: string }> {
        const user = await this.userRepo.findById(userId);
        if (!user?.stripe_customer_id) {
            throw new Error("No Stripe customer found for user");
        }

        const session = await this.stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: returnUrl
        });

        return {
            portalUrl: session.url
        };
    }

    /**
     * Cancel a subscription (at period end by default).
     */
    async cancelSubscription(
        subscriptionId: string,
        cancelAtPeriodEnd: boolean = true
    ): Promise<void> {
        if (cancelAtPeriodEnd) {
            await this.stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true
            });
            logger.info({ subscriptionId }, "Subscription set to cancel at period end");
        } else {
            await this.stripe.subscriptions.cancel(subscriptionId);
            logger.info({ subscriptionId }, "Subscription canceled immediately");
        }
    }

    /**
     * Reactivate a subscription that was set to cancel.
     */
    async reactivateSubscription(subscriptionId: string): Promise<void> {
        await this.stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false
        });
        logger.info({ subscriptionId }, "Subscription reactivated");
    }

    /**
     * Get subscription details from Stripe.
     */
    async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
        try {
            return await this.stripe.subscriptions.retrieve(subscriptionId);
        } catch (error) {
            // Handle Stripe errors - check for resource_missing code
            if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
                return null;
            }
            throw error;
        }
    }

    /**
     * Get customer invoices.
     */
    async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
        const invoices = await this.stripe.invoices.list({
            customer: customerId,
            limit
        });
        return invoices.data;
    }

    /**
     * Retrieve a checkout session.
     */
    async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["subscription", "payment_intent"]
        });
    }

    /**
     * Construct a webhook event from the raw body.
     */
    constructWebhookEvent(body: string | Buffer, signature: string): Stripe.Event {
        const webhookSecret = config.stripe?.webhookSecret;
        if (!webhookSecret) {
            throw new Error("Stripe webhook secret not configured");
        }

        return this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    }

    /**
     * Map Stripe subscription status to our SubscriptionStatus.
     */
    mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
        switch (stripeStatus) {
            case "trialing":
                return "trialing";
            case "active":
                return "active";
            case "past_due":
                return "past_due";
            case "canceled":
            case "unpaid":
                return "canceled";
            case "incomplete":
            case "incomplete_expired":
                return "incomplete";
            default:
                return "none";
        }
    }

    /**
     * Get plan slug from Stripe subscription metadata.
     */
    getPlanSlugFromMetadata(metadata: Stripe.Metadata): WorkspaceType | null {
        const planSlug = metadata?.planSlug;
        if (planSlug === "pro" || planSlug === "team") {
            return planSlug;
        }
        return null;
    }

    /**
     * Update workspace subscription details.
     */
    async updateWorkspaceSubscription(
        workspaceId: string,
        subscription: Stripe.Subscription
    ): Promise<void> {
        const planSlug = this.getPlanSlugFromMetadata(subscription.metadata);
        const status = this.mapSubscriptionStatus(subscription.status);

        // Get period dates from the first subscription item
        const firstItem = subscription.items?.data?.[0];
        const currentPeriodStart = firstItem?.current_period_start
            ? new Date(firstItem.current_period_start * 1000)
            : null;
        const currentPeriodEnd = firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : null;

        const updateData: Parameters<WorkspaceRepository["update"]>[1] = {
            stripe_subscription_id: subscription.id,
            subscription_status: status,
            subscription_current_period_start: currentPeriodStart,
            subscription_current_period_end: currentPeriodEnd,
            subscription_trial_end: subscription.trial_end
                ? new Date(subscription.trial_end * 1000)
                : null,
            subscription_cancel_at_period_end: subscription.cancel_at_period_end
        };

        // If we have a valid plan, update the workspace type and limits
        if (planSlug && status !== "canceled") {
            const limits = WORKSPACE_LIMITS[planSlug];
            updateData.type = planSlug;
            updateData.max_workflows = limits.max_workflows;
            updateData.max_agents = limits.max_agents;
            updateData.max_knowledge_bases = limits.max_knowledge_bases;
            updateData.max_kb_chunks = limits.max_kb_chunks;
            updateData.max_members = limits.max_members;
            updateData.max_connections = limits.max_connections;
            updateData.execution_history_days = limits.execution_history_days;
        }

        await this.workspaceRepo.update(workspaceId, updateData);

        logger.info(
            { workspaceId, subscriptionId: subscription.id, status, planSlug },
            "Updated workspace subscription"
        );
    }

    /**
     * Downgrade workspace to free tier.
     */
    async downgradeWorkspaceToFree(workspaceId: string): Promise<void> {
        const limits = WORKSPACE_LIMITS.free;

        await this.workspaceRepo.update(workspaceId, {
            type: "free",
            stripe_subscription_id: null,
            subscription_status: "none",
            subscription_current_period_start: null,
            subscription_current_period_end: null,
            subscription_trial_end: null,
            subscription_cancel_at_period_end: false,
            max_workflows: limits.max_workflows,
            max_agents: limits.max_agents,
            max_knowledge_bases: limits.max_knowledge_bases,
            max_kb_chunks: limits.max_kb_chunks,
            max_members: limits.max_members,
            max_connections: limits.max_connections,
            execution_history_days: limits.execution_history_days
        });

        logger.info({ workspaceId }, "Downgraded workspace to free tier");
    }

    // Get subscription price ID based on plan and interval
    private getSubscriptionPriceId(
        planSlug: "pro" | "team",
        interval: "monthly" | "annual"
    ): string | null {
        // These should be configured via environment variables
        const priceIds = config.stripe?.priceIds as StripePriceIds | undefined;
        if (!priceIds) {
            return null;
        }

        if (planSlug === "pro") {
            return interval === "monthly" ? priceIds.proMonthly : priceIds.proAnnual;
        } else {
            return interval === "monthly" ? priceIds.teamMonthly : priceIds.teamAnnual;
        }
    }

    // Get credit pack price ID
    private getCreditPackPriceId(packId: string): string | null {
        const priceIds = config.stripe?.creditPackPriceIds as CreditPackPriceIds | undefined;
        if (!priceIds) {
            return null;
        }

        return priceIds[packId as keyof CreditPackPriceIds] || null;
    }
}

// Singleton instance
export const stripeService = new StripeService();
