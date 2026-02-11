/**
 * CheckoutForm - Stripe PaymentElement for embedded checkout
 *
 * Handles both SetupIntent (for trials) and PaymentIntent (for immediate charges).
 * Styled to match the app's design system.
 */
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CreditCard, Shield, AlertCircle } from "lucide-react";
import React from "react";
import { Button } from "../common/Button";

interface CheckoutFormProps {
    /**
     * Called when payment is successfully completed
     */
    onSuccess: (subscriptionId: string) => void;

    /**
     * Called when there's an error during payment
     */
    onError: (error: string) => void;

    /**
     * The subscription ID from the backend
     */
    subscriptionId: string;

    /**
     * Whether this is a trial (SetupIntent) or immediate charge (PaymentIntent)
     */
    intentType: "setup" | "payment";

    /**
     * Number of trial days (0 if no trial)
     */
    trialDays: number;

    /**
     * Plan name to display
     */
    planName: string;

    /**
     * Price to display (e.g., "$29/month")
     */
    priceDisplay: string;

    /**
     * URL to redirect to after successful payment
     */
    returnUrl: string;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
    onSuccess,
    onError,
    subscriptionId,
    intentType,
    trialDays,
    planName,
    priceDisplay,
    returnUrl
}) => {
    const stripe = useStripe();
    const elements = useElements();

    const [isProcessing, setIsProcessing] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
    const [isReady, setIsReady] = React.useState(false);

    const handleSubmit = async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        try {
            let result;

            if (intentType === "setup") {
                // For trials - confirm SetupIntent
                result = await stripe.confirmSetup({
                    elements,
                    confirmParams: {
                        return_url: returnUrl
                    },
                    redirect: "if_required"
                });
            } else {
                // For immediate charges - confirm PaymentIntent
                result = await stripe.confirmPayment({
                    elements,
                    confirmParams: {
                        return_url: returnUrl
                    },
                    redirect: "if_required"
                });
            }

            if (result.error) {
                // Show error to customer
                const message =
                    result.error.message || "An error occurred during payment processing.";
                setErrorMessage(message);
                onError(message);
            } else {
                // Payment succeeded or requires redirect
                // If we get here without redirect, it means payment succeeded
                onSuccess(subscriptionId);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred.";
            setErrorMessage(message);
            onError(message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plan Summary */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{planName}</h3>
                        {trialDays > 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {trialDays}-day free trial
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                            {priceDisplay}
                        </p>
                        {trialDays > 0 && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                                Due after trial
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Element */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Payment details
                </label>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
                    <PaymentElement
                        onReady={() => setIsReady(true)}
                        options={{
                            layout: {
                                type: "tabs",
                                defaultCollapsed: false
                            },
                            fields: {
                                billingDetails: {
                                    address: {
                                        country: "auto"
                                    }
                                }
                            }
                        }}
                    />
                </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                            Payment failed
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {errorMessage}
                        </p>
                    </div>
                </div>
            )}

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Shield className="h-4 w-4" />
                <span>Secured by Stripe. Your payment info is encrypted.</span>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                disabled={!stripe || !elements || isProcessing || !isReady}
                className="w-full"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {trialDays > 0
                            ? `Start ${trialDays}-day free trial`
                            : `Subscribe for ${priceDisplay}`}
                    </>
                )}
            </Button>

            {/* Terms */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                By subscribing, you agree to our{" "}
                <a
                    href="/terms"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Terms of Service
                </a>{" "}
                and{" "}
                <a
                    href="/privacy"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Privacy Policy
                </a>
                .
                {trialDays > 0 && (
                    <>
                        {" "}
                        Your card will be charged {priceDisplay} after the {trialDays}-day trial
                        ends.
                    </>
                )}
            </p>
        </form>
    );
};

export default CheckoutForm;
