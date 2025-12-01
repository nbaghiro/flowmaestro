import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Logo } from "../components/common/Logo";
import { forgotPassword } from "../lib/api";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setIsLoading(true);

        try {
            await forgotPassword(email);
            setSuccess(true);
            setEmail("");
        } catch (err: unknown) {
            setError(
                (err as Error).message || "Failed to send reset email. Please try again later."
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
                            Forgot password?
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email address and we'll send you a link to reset your
                            password.
                        </p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6">
                            <Alert variant="success" title="Check your email">
                                If an account exists with this email, you will receive a password
                                reset link shortly.
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            loading={isLoading}
                        >
                            {isLoading ? "Sending..." : "Send reset link"}
                        </Button>
                    </form>

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
