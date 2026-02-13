import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { api } from "../../shared/api";
import { setAuthState } from "../../shared/storage";
import { useSidebarStore } from "../stores/sidebarStore";

type LoginMode = "options" | "email";

export function LoginScreen() {
    const [mode, setMode] = useState<LoginMode>("options");
    const [loadingProvider, setLoadingProvider] = useState<"google" | "microsoft" | "email" | null>(
        null
    );
    const [error, setError] = useState<string | null>(null);
    const { initialize } = useSidebarStore();

    // Email login state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [twoFactorRequired, setTwoFactorRequired] = useState(false);
    const [maskedPhone, setMaskedPhone] = useState("");

    const handleOAuthLogin = async (provider: "google" | "microsoft") => {
        setLoadingProvider(provider);
        setError(null);

        try {
            // Get the OAuth URL from backend
            const authUrl = await api.getOAuthUrl(provider);

            // Open OAuth popup using Chrome identity API
            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl,
                    interactive: true
                },
                async (redirectUrl) => {
                    if (chrome.runtime.lastError) {
                        setError(chrome.runtime.lastError.message || "Authentication failed");
                        setLoadingProvider(null);
                        return;
                    }

                    if (redirectUrl) {
                        try {
                            // Parse authorization code from redirect URL
                            const url = new URL(redirectUrl);
                            const code = url.searchParams.get("code");
                            const error = url.searchParams.get("error");

                            if (error) {
                                setError(`OAuth error: ${error}`);
                                setLoadingProvider(null);
                                return;
                            }

                            if (!code) {
                                setError("No authorization code received");
                                setLoadingProvider(null);
                                return;
                            }

                            // Exchange code for tokens
                            const authData = await api.exchangeOAuthCode(provider, code);

                            const expiresAt = new Date(
                                Date.now() + authData.expiresIn * 1000
                            ).toISOString();

                            await setAuthState({
                                isAuthenticated: true,
                                accessToken: authData.accessToken,
                                refreshToken: authData.refreshToken,
                                expiresAt,
                                user: authData.user,
                                workspace: authData.workspace || undefined,
                                workspaces: authData.workspaces || []
                            });

                            // Re-initialize to load user data
                            await initialize();
                        } catch (exchangeErr) {
                            setError(
                                exchangeErr instanceof Error
                                    ? exchangeErr.message
                                    : "Failed to complete authentication"
                            );
                        }
                    }

                    setLoadingProvider(null);
                }
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
            setLoadingProvider(null);
        }
    };

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingProvider("email");
        setError(null);

        try {
            const result = await api.loginWithEmail(
                email,
                password,
                twoFactorRequired ? twoFactorCode : undefined
            );

            if (result.type === "two_factor_required") {
                setTwoFactorRequired(true);
                setMaskedPhone(result.masked_phone);
                setLoadingProvider(null);
                return;
            }

            // Login successful
            // JWT tokens typically expire in 24 hours or 7 days
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            await setAuthState({
                isAuthenticated: true,
                accessToken: result.token,
                expiresAt,
                user: result.user
            });

            // Re-initialize to load user data
            await initialize();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
            setLoadingProvider(null);
        }
    };

    const resetToOptions = () => {
        setMode("options");
        setEmail("");
        setPassword("");
        setTwoFactorCode("");
        setTwoFactorRequired(false);
        setMaskedPhone("");
        setError(null);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen abstract-bg p-6">
            <img
                src="/assets/icons/icon-128.png"
                alt="FlowMaestro"
                className="w-16 h-16 rounded-xl mb-6"
            />

            <h1 className="text-xl font-semibold text-foreground mb-2">Welcome to FlowMaestro</h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
                Sign in to use workflows and agents with any web page
            </p>

            {error && (
                <div className="w-full max-w-xs mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {mode === "options" ? (
                <div className="w-full max-w-xs space-y-3">
                    {/* Email/Password option */}
                    <button
                        onClick={() => setMode("email")}
                        disabled={loadingProvider !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">
                            Continue with Email
                        </span>
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-background px-2 text-muted-foreground">or</span>
                        </div>
                    </div>

                    {/* Google OAuth */}
                    <button
                        onClick={() => handleOAuthLogin("google")}
                        disabled={loadingProvider !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingProvider === "google" ? (
                            <Loader2 className="w-5 h-5 animate-spin text-foreground" />
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
                                <span className="text-sm font-medium text-foreground">
                                    Continue with Google
                                </span>
                            </>
                        )}
                    </button>

                    {/* Microsoft OAuth */}
                    <button
                        onClick={() => handleOAuthLogin("microsoft")}
                        disabled={loadingProvider !== null}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingProvider === "microsoft" ? (
                            <Loader2 className="w-5 h-5 animate-spin text-foreground" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#F25022" d="M1 1h10v10H1z" />
                                    <path fill="#00A4EF" d="M1 13h10v10H1z" />
                                    <path fill="#7FBA00" d="M13 1h10v10H13z" />
                                    <path fill="#FFB900" d="M13 13h10v10H13z" />
                                </svg>
                                <span className="text-sm font-medium text-foreground">
                                    Continue with Microsoft
                                </span>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleEmailLogin} className="w-full max-w-xs space-y-4">
                    {!twoFactorRequired ? (
                        <>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                A verification code was sent to {maskedPhone}
                            </p>
                            <label
                                htmlFor="code"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Verification Code
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                required
                                autoFocus
                                className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Enter 6-digit code"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loadingProvider === "email"}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loadingProvider === "email" ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : twoFactorRequired ? (
                            "Verify Code"
                        ) : (
                            "Sign In"
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={resetToOptions}
                        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Back to sign in options
                    </button>
                </form>
            )}

            <p className="mt-8 text-xs text-muted-foreground text-center">
                By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
        </div>
    );
}
