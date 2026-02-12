// Billing Types
// ==============

export type SubscriptionStatus =
    | "none"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "incomplete";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type PaymentType = "subscription" | "credit_pack" | "one_time";

// ============================================================================
// Subscription Plans
// ============================================================================

export interface SubscriptionPlan {
    id: string;
    name: string;
    slug: "free" | "pro" | "team";
    monthlyPriceCents: number;
    annualPriceCents: number;
    monthlyCredits: number;
    trialDays: number;
    features: string[];
    limits: {
        maxWorkflows: number;
        maxAgents: number;
        maxKnowledgeBases: number;
        maxKbChunks: number;
        maxMembers: number;
        maxConnections: number;
        executionHistoryDays: number;
    };
}

export const SUBSCRIPTION_PLANS: Record<"free" | "pro" | "team", SubscriptionPlan> = {
    free: {
        id: "free",
        name: "Free",
        slug: "free",
        monthlyPriceCents: 0,
        annualPriceCents: 0,
        monthlyCredits: 250,
        trialDays: 0,
        features: [
            "5 workflows",
            "2 agents",
            "1 knowledge base",
            "250 credits/month",
            "7 days execution history"
        ],
        limits: {
            maxWorkflows: 5,
            maxAgents: 2,
            maxKnowledgeBases: 1,
            maxKbChunks: 100,
            maxMembers: 1,
            maxConnections: 5,
            executionHistoryDays: 7
        }
    },
    pro: {
        id: "pro",
        name: "Pro",
        slug: "pro",
        monthlyPriceCents: 2900,
        annualPriceCents: 29000,
        monthlyCredits: 5000,
        trialDays: 14,
        features: [
            "50 workflows",
            "20 agents",
            "10 knowledge bases",
            "5,000 credits/month",
            "30 days execution history",
            "5 team members",
            "Priority support"
        ],
        limits: {
            maxWorkflows: 50,
            maxAgents: 20,
            maxKnowledgeBases: 10,
            maxKbChunks: 5000,
            maxMembers: 5,
            maxConnections: 25,
            executionHistoryDays: 30
        }
    },
    team: {
        id: "team",
        name: "Team",
        slug: "team",
        monthlyPriceCents: 9900,
        annualPriceCents: 99000,
        monthlyCredits: 25000,
        trialDays: 14,
        features: [
            "Unlimited workflows",
            "Unlimited agents",
            "50 knowledge bases",
            "25,000 credits/month",
            "90 days execution history",
            "Unlimited team members",
            "Priority support",
            "Custom integrations"
        ],
        limits: {
            maxWorkflows: -1,
            maxAgents: -1,
            maxKnowledgeBases: 50,
            maxKbChunks: 50000,
            maxMembers: -1,
            maxConnections: -1,
            executionHistoryDays: 90
        }
    }
};

// ============================================================================
// Subscription Details
// ============================================================================

export interface SubscriptionDetails {
    status: SubscriptionStatus;
    planSlug: "free" | "pro" | "team";
    planName: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
}

// ============================================================================
// Checkout Session
// ============================================================================

export interface CreateCheckoutSessionInput {
    planSlug: "pro" | "team";
    billingInterval: "monthly" | "annual";
    successUrl: string;
    cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
    checkoutUrl: string;
    sessionId: string;
}

// ============================================================================
// Credit Pack Purchase
// ============================================================================

export interface PurchaseCreditPackInput {
    packId: string;
    successUrl: string;
    cancelUrl: string;
}

export interface PurchaseCreditPackResponse {
    checkoutUrl: string;
    sessionId: string;
}

// ============================================================================
// Billing Portal
// ============================================================================

export interface CreatePortalSessionInput {
    returnUrl: string;
}

export interface CreatePortalSessionResponse {
    portalUrl: string;
}

// ============================================================================
// Payment History
// ============================================================================

export interface PaymentHistoryItem {
    id: string;
    amountCents: number;
    currency: string;
    status: PaymentStatus;
    paymentType: PaymentType;
    description: string | null;
    invoiceUrl?: string | null;
    createdAt: string;
}

// ============================================================================
// Invoice
// ============================================================================

export interface Invoice {
    id: string;
    stripeInvoiceId: string;
    amountDue: number;
    amountPaid: number;
    currency: string;
    status: string;
    invoicePdfUrl: string | null;
    hostedInvoiceUrl: string | null;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
}
