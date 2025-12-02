import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Logo } from "../components/common/Logo";
import { resetPassword } from "../lib/api";

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (!tokenParam) {
            setError("Invalid or missing reset token. Please request a new password reset link.");
        } else {
            setToken(tokenParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Validation
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!token) {
            setError("Invalid reset token.");
            return;
        }

        setIsLoading(true);

        try {
            await resetPassword(token, password);
            setSuccess(true);
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err: unknown) {
            setError(
                (err as Error).message || "Failed to reset password. The link may have expired."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background px-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-lg shadow-lg p-8">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex mb-4">
                            <Logo size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Reset your password
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your new password below.
                        </p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6">
                            <Alert variant="success" title="Password reset successful!">
                                Redirecting to login page...
                            </Alert>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6">
                            <Alert variant="error">{error}</Alert>
                        </div>
                    )}

                    {/* Form */}
                    {!success && token && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    New Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Must be at least 8 characters
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Confirm Password
                                </label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full"
                                loading={isLoading}
                            >
                                {isLoading ? "Resetting password..." : "Reset password"}
                            </Button>
                        </form>
                    )}

                    {/* Back to Login Link */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
