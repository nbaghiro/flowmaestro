/**
 * CheckoutForm - Stripe PaymentElement for embedded checkout
 *
 * Handles both SetupIntent (for trials) and PaymentIntent (for immediate charges).
 * Styled to match the app's design system.
 */
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Shield, AlertCircle } from "lucide-react";
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
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Plan Summary */}
            <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-foreground">{planName}</h3>
                        {trialDays > 0 && (
                            <p className="text-sm text-muted-foreground">
                                {trialDays}-day free trial
                            </p>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-foreground">{priceDisplay}</p>
                        {trialDays > 0 && (
                            <p className="text-sm text-muted-foreground">Due after trial</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Element */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Payment details</label>
                <div className="rounded-lg border border-border p-4 bg-card">
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
                <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-destructive">Payment failed</p>
                        <p className="text-sm text-destructive/80 mt-0.5">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Secured by Stripe. Your payment info is encrypted.</span>
            </div>

            {/* Submit Button */}
            <Button
                type="submit"
                variant="primary"
                disabled={!stripe || !elements || isProcessing || !isReady}
                loading={isProcessing}
                className="w-full"
            >
                {!isProcessing && <CreditCard className="mr-2 h-4 w-4" />}
                {trialDays > 0
                    ? `Start ${trialDays}-day free trial`
                    : `Subscribe for ${priceDisplay}`}
            </Button>

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground">
                By subscribing, you agree to our{" "}
                <a
                    href="/terms"
                    className="text-foreground hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Terms of Service
                </a>{" "}
                and{" "}
                <a
                    href="/privacy"
                    className="text-foreground hover:underline"
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
