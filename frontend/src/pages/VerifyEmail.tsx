import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { verifyEmail as verifyEmailApi } from "../lib/api";

export function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        const verifyEmailToken = async () => {
            const token = searchParams.get("token");

            if (!token) {
                setError("Invalid or missing verification token.");
                setIsLoading(false);
                return;
            }

            try {
                const response = await verifyEmailApi(token);
                setSuccess(true);
                setMessage(response.data?.message || "Email verified successfully!");
                // Redirect to app after 2 seconds
                setTimeout(() => {
                    navigate("/app");
                }, 2000);
            } catch (err: unknown) {
                setError(
                    (err as Error).message || "Failed to verify email. The link may have expired."
                );
            } finally {
                setIsLoading(false);
            }
        };

        verifyEmailToken();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-[#222222] px-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-lg shadow-lg p-8">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-lg mb-4">
                            <span className="text-white font-bold text-2xl">FM</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Email Verification
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Verifying your email address...
                        </p>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">
                                Please wait while we verify your email...
                            </p>
                        </div>
                    )}

                    {/* Success Message */}
                    {!isLoading && success && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">
                                <p className="font-medium">{message}</p>
                                <p className="mt-1">Redirecting to your dashboard...</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {!isLoading && error && (
                        <div className="mb-6">
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <p className="font-medium">Verification failed</p>
                                    <p className="mt-1">{error}</p>
                                </div>
                            </div>

                            <div className="mt-4 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    Need a new verification link?
                                </p>
                                <Link
                                    to="/app"
                                    className="text-sm text-primary hover:underline font-medium"
                                >
                                    Go to dashboard to resend
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Back to Login Link */}
                    {!isLoading && (
                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="text-sm text-primary hover:underline font-medium"
                            >
                                Back to sign in
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
