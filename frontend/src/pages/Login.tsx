import { Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Logo } from "../components/common/Logo";
import { Divider } from "../components/common/Separator";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useMicrosoftAuth } from "../hooks/useMicrosoftAuth";
import { useAuthStore } from "../stores/authStore";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [maskedPhone, setMaskedPhone] = useState<string | undefined>(undefined);
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuthStore();
    const { loginWithGoogle, isLoading: isGoogleLoading } = useGoogleAuth();
    const { loginWithMicrosoft, isLoading: isMicrosoftLoading } = useMicrosoftAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await login(
                email,
                password,
                twoFactorRequired ? code.trim() || undefined : undefined
            );

            if (result.twoFactorRequired) {
                setTwoFactorRequired(true);
                setMaskedPhone(result.maskedPhone);
                setCode("");
                setUseBackupCode(false);
                return;
            }

            navigate("/app");
        } catch (err: unknown) {
            setError((err as Error).message || "Failed to login. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#222222] px-4">
            <div className="w-full max-w-md">
                <div className="bg-card rounded-lg shadow-lg p-8">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex mb-4">
                            <Logo size="lg" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back</h1>
                        <p className="text-sm text-muted-foreground">
                            Sign in to your FlowMaestro account
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6">
                            <Alert variant="error">{error}</Alert>
                        </div>
                    )}

                    {/* Login Form */}
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
                                disabled={isLoading || twoFactorRequired}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-foreground"
                                >
                                    Password
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-primary hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="••••••••"
                                disabled={isLoading || twoFactorRequired}
                            />
                        </div>

                        {twoFactorRequired ? (
                            <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                    {useBackupCode ? (
                                        <>Enter one of your backup codes.</>
                                    ) : (
                                        <>
                                            Enter the 6-digit code sent to{" "}
                                            <span className="font-medium text-foreground">
                                                {maskedPhone || "your phone"}
                                            </span>
                                            .
                                        </>
                                    )}
                                </div>
                                <Input
                                    id="code"
                                    type="text"
                                    inputMode={useBackupCode ? "text" : "numeric"}
                                    maxLength={useBackupCode ? undefined : 6}
                                    value={code}
                                    onChange={(e) =>
                                        setCode(
                                            useBackupCode
                                                ? e.target.value
                                                      .replace(/[^A-Za-z0-9-]/g, "")
                                                      .toUpperCase()
                                                : e.target.value.replace(/\D/g, "")
                                        )
                                    }
                                    required
                                    placeholder={useBackupCode ? "XXXX-XXXX-XXXX" : "123456"}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className="text-xs text-primary hover:text-primary/80"
                                    onClick={() => {
                                        setUseBackupCode((prev) => !prev);
                                        setCode("");
                                    }}
                                >
                                    {useBackupCode ? "Use SMS code instead" : "Use a backup code"}
                                </button>
                            </div>
                        ) : null}

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            loading={isLoading}
                        >
                            {twoFactorRequired
                                ? isLoading
                                    ? "Verifying..."
                                    : "Verify code"
                                : isLoading
                                  ? "Signing in..."
                                  : "Sign in"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <Divider label="OR" className="my-6" />

                    {/* OAuth Sign In Buttons */}
                    <div className="space-y-3">
                        {/* Google Sign In Button */}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={loginWithGoogle}
                            disabled={isLoading || isGoogleLoading || isMicrosoftLoading}
                            className="w-full gap-3"
                        >
                            {isGoogleLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Connecting to Google...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </>
                            )}
                        </Button>

                        {/* Microsoft Sign In Button */}
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={loginWithMicrosoft}
                            disabled={isLoading || isGoogleLoading || isMicrosoftLoading}
                            className="w-full gap-3"
                        >
                            {isMicrosoftLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Connecting to Microsoft...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" viewBox="0 0 23 23">
                                        <path fill="#f35325" d="M1 1h10v10H1z" />
                                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                                    </svg>
                                    Continue with Microsoft
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Register Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                className="text-primary hover:underline font-medium"
                            >
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
