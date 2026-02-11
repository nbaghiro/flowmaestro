/**
 * Stripe Elements Provider with theme-aware appearance
 *
 * Provides the Stripe context for PaymentElement and other Stripe Elements.
 * Automatically syncs with the app's dark/light theme.
 */
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, Stripe, Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import React from "react";
import { useThemeStore } from "../../stores/themeStore";

// Load Stripe outside of component to avoid recreating on every render
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
    if (!stripePromise && stripePublishableKey) {
        stripePromise = loadStripe(stripePublishableKey);
    }
    return stripePromise || Promise.resolve(null);
}

/**
 * Get Stripe Elements appearance configuration based on theme
 */
function getStripeAppearance(theme: "light" | "dark"): Appearance {
    if (theme === "dark") {
        return {
            theme: "night",
            variables: {
                // Colors
                colorPrimary: "#6366f1", // Indigo-500
                colorBackground: "#1f2937", // Gray-800
                colorText: "#f9fafb", // Gray-50
                colorTextSecondary: "#9ca3af", // Gray-400
                colorTextPlaceholder: "#6b7280", // Gray-500
                colorDanger: "#ef4444", // Red-500
                colorSuccess: "#22c55e", // Green-500

                // Spacing
                spacingUnit: "4px",
                borderRadius: "8px",

                // Fonts
                fontFamily:
                    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSizeBase: "14px",
                fontWeightNormal: "400",
                fontWeightMedium: "500",
                fontWeightBold: "600",

                // Focus ring
                focusBoxShadow: "0 0 0 3px rgba(99, 102, 241, 0.3)",
                focusOutline: "none"
            },
            rules: {
                ".Input": {
                    backgroundColor: "#374151", // Gray-700
                    border: "1px solid #4b5563", // Gray-600
                    boxShadow: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease"
                },
                ".Input:hover": {
                    borderColor: "#6b7280" // Gray-500
                },
                ".Input:focus": {
                    borderColor: "#6366f1", // Indigo-500
                    boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.3)"
                },
                ".Input--invalid": {
                    borderColor: "#ef4444" // Red-500
                },
                ".Label": {
                    color: "#e5e7eb", // Gray-200
                    fontWeight: "500",
                    marginBottom: "4px"
                },
                ".Tab": {
                    backgroundColor: "#374151", // Gray-700
                    borderColor: "#4b5563", // Gray-600
                    color: "#d1d5db" // Gray-300
                },
                ".Tab:hover": {
                    backgroundColor: "#4b5563", // Gray-600
                    color: "#f9fafb" // Gray-50
                },
                ".Tab--selected": {
                    backgroundColor: "#4f46e5", // Indigo-600
                    borderColor: "#4f46e5",
                    color: "#ffffff"
                },
                ".TabIcon": {
                    fill: "#9ca3af" // Gray-400
                },
                ".TabIcon--selected": {
                    fill: "#ffffff"
                },
                ".Error": {
                    color: "#fca5a5", // Red-300
                    fontSize: "13px"
                }
            }
        };
    }

    // Light theme
    return {
        theme: "stripe",
        variables: {
            // Colors
            colorPrimary: "#4f46e5", // Indigo-600
            colorBackground: "#ffffff",
            colorText: "#1f2937", // Gray-800
            colorTextSecondary: "#6b7280", // Gray-500
            colorTextPlaceholder: "#9ca3af", // Gray-400
            colorDanger: "#dc2626", // Red-600
            colorSuccess: "#16a34a", // Green-600

            // Spacing
            spacingUnit: "4px",
            borderRadius: "8px",

            // Fonts
            fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            fontSizeBase: "14px",
            fontWeightNormal: "400",
            fontWeightMedium: "500",
            fontWeightBold: "600",

            // Focus ring
            focusBoxShadow: "0 0 0 3px rgba(79, 70, 229, 0.2)",
            focusOutline: "none"
        },
        rules: {
            ".Input": {
                backgroundColor: "#ffffff",
                border: "1px solid #d1d5db", // Gray-300
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease"
            },
            ".Input:hover": {
                borderColor: "#9ca3af" // Gray-400
            },
            ".Input:focus": {
                borderColor: "#4f46e5", // Indigo-600
                boxShadow: "0 0 0 3px rgba(79, 70, 229, 0.2)"
            },
            ".Input--invalid": {
                borderColor: "#dc2626" // Red-600
            },
            ".Label": {
                color: "#374151", // Gray-700
                fontWeight: "500",
                marginBottom: "4px"
            },
            ".Tab": {
                backgroundColor: "#f9fafb", // Gray-50
                borderColor: "#e5e7eb", // Gray-200
                color: "#4b5563" // Gray-600
            },
            ".Tab:hover": {
                backgroundColor: "#f3f4f6", // Gray-100
                color: "#1f2937" // Gray-800
            },
            ".Tab--selected": {
                backgroundColor: "#4f46e5", // Indigo-600
                borderColor: "#4f46e5",
                color: "#ffffff"
            },
            ".TabIcon": {
                fill: "#6b7280" // Gray-500
            },
            ".TabIcon--selected": {
                fill: "#ffffff"
            },
            ".Error": {
                color: "#dc2626", // Red-600
                fontSize: "13px"
            }
        }
    };
}

interface StripeProviderProps {
    children: React.ReactNode;
    clientSecret: string;
    intentType: "setup" | "payment";
}

/**
 * StripeProvider wraps children with Stripe Elements context
 *
 * @param clientSecret - The client_secret from SetupIntent or PaymentIntent
 * @param intentType - Whether this is a "setup" (for trials) or "payment" (for immediate charge)
 */
export const StripeProvider: React.FC<StripeProviderProps> = ({
    children,
    clientSecret,
    intentType: _intentType
}) => {
    const { effectiveTheme } = useThemeStore();
    const [stripe, setStripe] = React.useState<Stripe | null>(null);

    // Load Stripe on mount
    React.useEffect(() => {
        getStripe().then(setStripe);
    }, []);

    // Get appearance based on current theme
    const appearance = React.useMemo(() => getStripeAppearance(effectiveTheme), [effectiveTheme]);

    // Elements options - the clientSecret already encodes whether this is a
    // SetupIntent or PaymentIntent, so we don't need to specify mode
    const options: StripeElementsOptions = React.useMemo(
        () => ({
            clientSecret,
            appearance
        }),
        [clientSecret, appearance]
    );

    if (!stripe || !stripePublishableKey) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-pulse text-gray-500 dark:text-gray-400">
                    Loading payment form...
                </div>
            </div>
        );
    }

    return (
        <Elements stripe={stripe} options={options} key={clientSecret}>
            {children}
        </Elements>
    );
};

export default StripeProvider;
