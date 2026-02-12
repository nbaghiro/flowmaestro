/**
 * UpgradeDialog - Modal dialog for upgrading subscription
 *
 * Shows plan selection and embedded Stripe checkout with PaymentElement.
 */
import { Check, Zap, Users, ArrowLeft } from "lucide-react";
import React from "react";
import { SUBSCRIPTION_PLANS } from "@flowmaestro/shared";
import { createEmbeddedSubscription, CreateEmbeddedSubscriptionResponse } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Button } from "../common/Button";
import { Dialog } from "../common/Dialog";
import { CheckoutForm } from "./CheckoutForm";
import { StripeProvider } from "./StripeProvider";

type PlanSlug = "pro" | "team";
type BillingInterval = "monthly" | "annual";

interface UpgradeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    workspaceId: string;
    currentPlan?: string;
    onSuccess?: () => void;
}

interface PlanOption {
    slug: PlanSlug;
    name: string;
    description: string;
    monthlyPrice: number;
    annualPrice: number;
    credits: number;
    features: string[];
    icon: React.ReactNode;
}

const PLAN_OPTIONS: PlanOption[] = [
    {
        slug: "pro",
        name: "Pro",
        description: "For individuals and small teams",
        monthlyPrice: 29,
        annualPrice: 290,
        credits: 5000,
        features: [
            "5,000 credits/month",
            "Unlimited workflows",
            "All integrations",
            "Priority support",
            "Custom branding"
        ],
        icon: <Zap className="h-4 w-4" />
    },
    {
        slug: "team",
        name: "Team",
        description: "For growing organizations",
        monthlyPrice: 99,
        annualPrice: 990,
        credits: 25000,
        features: [
            "25,000 credits/month",
            "Everything in Pro",
            "Team collaboration",
            "Advanced analytics",
            "SSO & audit logs"
        ],
        icon: <Users className="h-4 w-4" />
    }
];

type DialogStep = "select" | "checkout" | "success";

export const UpgradeDialog: React.FC<UpgradeDialogProps> = ({
    isOpen,
    onClose,
    workspaceId,
    currentPlan,
    onSuccess
}) => {
    const [step, setStep] = React.useState<DialogStep>("select");
    const [selectedPlan, setSelectedPlan] = React.useState<PlanSlug>("pro");
    const [billingInterval, setBillingInterval] = React.useState<BillingInterval>("monthly");
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [subscriptionData, setSubscriptionData] =
        React.useState<CreateEmbeddedSubscriptionResponse | null>(null);

    // Reset state when dialog closes
    React.useEffect(() => {
        if (!isOpen) {
            setStep("select");
            setSelectedPlan("pro");
            setBillingInterval("monthly");
            setIsLoading(false);
            setError(null);
            setSubscriptionData(null);
        }
    }, [isOpen]);

    const handleProceedToCheckout = async (): Promise<void> => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await createEmbeddedSubscription(
                workspaceId,
                selectedPlan,
                billingInterval
            );
            setSubscriptionData(data);
            setStep("checkout");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initialize checkout");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckoutSuccess = (_subscriptionId: string): void => {
        setStep("success");
        onSuccess?.();
    };

    const handleCheckoutError = (errorMsg: string): void => {
        setError(errorMsg);
    };

    const selectedPlanData = PLAN_OPTIONS.find((p) => p.slug === selectedPlan)!;
    const priceDisplay =
        billingInterval === "monthly"
            ? `$${selectedPlanData.monthlyPrice}/month`
            : `$${selectedPlanData.annualPrice}/year`;

    const returnUrl = `${window.location.origin}/billing/success?workspaceId=${workspaceId}`;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} size="2xl">
            {/* Plan Selection Step */}
            {step === "select" && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            Upgrade your workspace
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose a plan that works best for your needs
                        </p>
                    </div>

                    {/* Billing Interval Toggle */}
                    <div className="flex items-center justify-center">
                        <div className="flex bg-muted rounded-lg p-0.5">
                            <button
                                onClick={() => setBillingInterval("monthly")}
                                className={cn(
                                    "min-w-[6rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
                                    billingInterval === "monthly"
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingInterval("annual")}
                                className={cn(
                                    "min-w-[6rem] px-3 py-1 text-sm font-medium text-center rounded-md transition-colors",
                                    billingInterval === "annual"
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Annual
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                    Save 17%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Plan Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PLAN_OPTIONS.map((plan) => {
                            const isSelected = selectedPlan === plan.slug;
                            const isCurrent = currentPlan === plan.slug;
                            const planPrice =
                                billingInterval === "monthly"
                                    ? plan.monthlyPrice
                                    : plan.annualPrice;

                            return (
                                <button
                                    key={plan.slug}
                                    onClick={() => !isCurrent && setSelectedPlan(plan.slug)}
                                    disabled={isCurrent}
                                    className={cn(
                                        "relative text-left p-4 rounded-lg border transition-all",
                                        isSelected && !isCurrent
                                            ? "border-foreground/50 bg-muted/30"
                                            : "border-border hover:border-border/80 hover:bg-muted/20",
                                        isCurrent && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {isCurrent && (
                                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded border border-border">
                                            Current
                                        </span>
                                    )}

                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                                                {plan.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-foreground">
                                                    {plan.name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {plan.description}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && !isCurrent && (
                                            <div className="flex-shrink-0 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-background" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <span className="text-2xl font-semibold text-foreground">
                                            ${planPrice}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            /{billingInterval === "monthly" ? "mo" : "yr"}
                                        </span>
                                    </div>

                                    <ul className="mt-4 space-y-1.5">
                                        {plan.features.map((feature, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 text-sm text-muted-foreground"
                                            >
                                                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleProceedToCheckout}
                            disabled={isLoading || currentPlan === selectedPlan}
                            loading={isLoading}
                        >
                            Continue to checkout
                        </Button>
                    </div>
                </div>
            )}

            {/* Checkout Step */}
            {step === "checkout" && subscriptionData && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setStep("select")}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Complete your subscription
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Enter your payment details below
                            </p>
                        </div>
                    </div>

                    <StripeProvider
                        clientSecret={subscriptionData.clientSecret}
                        intentType={subscriptionData.intentType}
                    >
                        <CheckoutForm
                            subscriptionId={subscriptionData.subscriptionId}
                            intentType={subscriptionData.intentType}
                            trialDays={subscriptionData.trialDays}
                            planName={SUBSCRIPTION_PLANS[selectedPlan].name}
                            priceDisplay={priceDisplay}
                            returnUrl={returnUrl}
                            onSuccess={handleCheckoutSuccess}
                            onError={handleCheckoutError}
                        />
                    </StripeProvider>
                </div>
            )}

            {/* Success Step */}
            {step === "success" && (
                <div className="text-center py-8 space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
                        <Check className="w-6 h-6 text-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Welcome to {selectedPlanData.name}!
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Your subscription has been activated. You now have access to all{" "}
                        {selectedPlanData.name} features.
                    </p>
                    <Button variant="primary" onClick={onClose}>
                        Get started
                    </Button>
                </div>
            )}
        </Dialog>
    );
};

export default UpgradeDialog;
