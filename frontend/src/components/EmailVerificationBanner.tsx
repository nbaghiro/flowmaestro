import { AlertCircle, CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { useState } from "react";
import { resendVerificationEmail } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

export function EmailVerificationBanner() {
    const { user } = useAuthStore();
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [resendError, setResendError] = useState("");
    const [isDismissed, setIsDismissed] = useState(false);

    // Don't show banner if:
    // - User is not logged in
    // - Email is already verified
    // - User dismissed it
    // - User is OAuth user (they don't need email verification)
    if (!user || user.email_verified || isDismissed || (user.google_id && !user.has_password)) {
        return null;
    }

    const handleResend = async () => {
        setIsResending(true);
        setResendError("");
        setResendSuccess(false);

        try {
            await resendVerificationEmail();
            setResendSuccess(true);
            // Hide success message after 5 seconds
            setTimeout(() => {
                setResendSuccess(false);
            }, 5000);
        } catch (err: unknown) {
            setResendError((err as Error).message || "Failed to resend verification email.");
        } finally {
            setIsResending(false);
        }
    };

    const handleDismiss = () => {
        setIsDismissed(true);
    };

    return (
        <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Mail className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-yellow-800">
                                Please verify your email address
                            </p>
                            <p className="text-xs text-yellow-700 mt-0.5">
                                Check your inbox for a verification link, or click the button to
                                resend.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {resendSuccess ? (
                            <div className="flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Verification email sent!</span>
                            </div>
                        ) : resendError ? (
                            <div className="flex items-center gap-2 text-red-700 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                <span>{resendError}</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleResend}
                                disabled={isResending}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Resend email"
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleDismiss}
                            className="text-yellow-600 hover:text-yellow-800 transition-colors p-1"
                            aria-label="Dismiss banner"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
