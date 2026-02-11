/**
 * UpgradeDialog - Modal dialog for upgrading subscription
 *
 * Shows plan selection and embedded Stripe checkout with PaymentElement.
 */
import { Check, Loader2, Zap, Users, ArrowLeft } from "lucide-react";
import React from "react";
import { SUBSCRIPTION_PLANS } from "@flowmaestro/shared";
import { createEmbeddedSubscription, CreateEmbeddedSubscriptionResponse } from "../../lib/api";
import { cn } from "../../lib/utils";
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
    popular?: boolean;
}

const PLAN_OPTIONS: PlanOption[] = [
    {
        slug: "pro",
        name: "Pro",
        description: "For individuals and small teams",
        monthlyPrice: 29,
        annualPrice: 290,
        credits: 2500,
        features: [
            "2,500 credits/month",
            "Unlimited workflows",
            "All integrations",
            "Priority support",
            "Custom branding"
        ],
        icon: <Zap className="h-5 w-5" />
    },
    {
        slug: "team",
        name: "Team",
        description: "For growing organizations",
        monthlyPrice: 99,
        annualPrice: 990,
        credits: 10000,
        features: [
            "10,000 credits/month",
            "Everything in Pro",
            "Team collaboration",
            "Advanced analytics",
            "SSO & audit logs"
        ],
        icon: <Users className="h-5 w-5" />,
        popular: true
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
        <Dialog isOpen={isOpen} onClose={onClose} title="" className="max-w-2xl">
            {/* Plan Selection Step */}
            {step === "select" && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Upgrade your workspace
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Choose a plan that works best for your needs
                        </p>
                    </div>

                    {/* Billing Interval Toggle */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => setBillingInterval("monthly")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                billingInterval === "monthly"
                                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingInterval("annual")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                billingInterval === "annual"
                                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            Annual
                            <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                                Save 17%
                            </span>
                        </button>
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
                                        "relative text-left p-4 rounded-xl border-2 transition-all",
                                        isSelected && !isCurrent
                                            ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                                        isCurrent && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {plan.popular && (
                                        <span className="absolute -top-3 left-4 px-2 py-0.5 text-xs font-medium bg-indigo-500 text-white rounded-full">
                                            Most Popular
                                        </span>
                                    )}
                                    {isCurrent && (
                                        <span className="absolute -top-3 right-4 px-2 py-0.5 text-xs font-medium bg-gray-500 text-white rounded-full">
                                            Current Plan
                                        </span>
                                    )}

                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "p-2 rounded-lg",
                                                    isSelected
                                                        ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                                                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                                )}
                                            >
                                                {plan.icon}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {plan.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {plan.description}
                                                </p>
                                            </div>
                                        </div>
                                        {isSelected && !isCurrent && (
                                            <div className="flex-shrink-0 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                            ${planPrice}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400">
                                            /{billingInterval === "monthly" ? "mo" : "yr"}
                                        </span>
                                    </div>

                                    <ul className="mt-4 space-y-2">
                                        {plan.features.map((feature, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
                                            >
                                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                </button>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleProceedToCheckout}
                            disabled={isLoading || currentPlan === selectedPlan}
                            className={cn(
                                "px-6 py-2 text-sm font-medium rounded-lg transition-colors",
                                "bg-indigo-600 text-white hover:bg-indigo-700",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "flex items-center gap-2"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>Continue to checkout</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Checkout Step */}
            {step === "checkout" && subscriptionData && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setStep("select")}
                            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Complete your subscription
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Welcome to {selectedPlanData.name}!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Your subscription has been activated. You now have access to all{" "}
                        {selectedPlanData.name} features.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                        Get started
                    </button>
                </div>
            )}
        </Dialog>
    );
};

export default UpgradeDialog;
