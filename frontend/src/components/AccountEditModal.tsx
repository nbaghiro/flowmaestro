import { X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
type User = NonNullable<ReturnType<typeof useAuth>["user"]>;

interface AccountEditModalProps {
    mode: "profile" | "security";
    user: User;
    onClose: () => void;
    onUpdated?: () => void | Promise<void>;
}

export function AccountEditModal({ mode, user, onClose, onUpdated }: AccountEditModalProps) {
    const [name, setName] = useState(user.name ?? "");
    const [email, setEmail] = useState(user.email ?? "");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTwoFactorSubmitting, setIsTwoFactorSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isConfirmingEmailChange, setIsConfirmingEmailChange] = useState(false);
    const [isConfirmingDisable2FA, setIsConfirmingDisable2FA] = useState(false);
    const [twoFactorStep, setTwoFactorStep] = useState<"idle" | "enterPhone" | "verify">("idle");
    const [twoFactorPhoneInput, setTwoFactorPhoneInput] = useState(user.two_factor_phone || "");
    const [twoFactorCode, setTwoFactorCode] = useState("");

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const hasOAuthLink = Boolean(user.google_id || user.microsoft_id);
    const oauthProviderName = user.google_id
        ? "Google"
        : user.microsoft_id
          ? "Microsoft"
          : "OAuth provider";
    const emailLockedByOAuth = hasOAuthLink && !user.has_password;

    const sanitizePhoneInput = (value: string) => {
        const cleaned = value.replace(/[^+\d]/g, "");
        let result = "";
        for (let i = 0; i < cleaned.length; i++) {
            const ch = cleaned[i];
            if (ch === "+") {
                if (result.includes("+") || i !== 0) continue;
                result += ch;
            } else {
                result += ch;
            }
        }
        // E.164 max length is 15 digits
        return result.slice(0, 16);
    };

    const normalizePhoneForApi = (input: string) => {
        const stripped = input.trim();
        if (!stripped) return "";
        const digits = stripped.replace(/\D/g, "");
        if (digits.length < 8 || digits.length > 15) return "";
        return `+${digits}`;
    };

    const formatPhoneForDisplay = (value: string | null | undefined) => {
        if (!value) return "";
        const digits = value.replace(/\D/g, "");
        if (!digits) return value;
        // US/Canada: +1 (AAA) BBB-CCCC
        if (digits.length === 11 && digits.startsWith("1")) {
            const a = digits.slice(1, 4);
            const b = digits.slice(4, 7);
            const c = digits.slice(7, 11);
            return `+1 (${a}) ${b}-${c}`;
        }
        // Generic: prefix + country code + grouped remainder
        const countryLen = digits.length <= 4 ? digits.length : 2;
        const country = digits.slice(0, countryLen);
        const rest = digits.slice(countryLen);
        const parts: string[] = rest.match(/.{1,3}/g) || [];
        return `+${country}${parts.length ? " " + parts.join(" ") : ""}`;
    };

    const submitProfileChanges = async () => {
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);
        setIsConfirmingEmailChange(false);

        try {
            // 1) Update name if changed
            if (name !== user.name) {
                const res = await fetch(`${apiBase}/api/auth/me/name`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                    },
                    body: JSON.stringify({ name })
                });
                if (!res.ok) {
                    throw new Error("Failed to update name");
                }
            }

            // 2) Update email if changed
            if (email !== user.email) {
                const res = await fetch(`${apiBase}/api/auth/me/email`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                    },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();

                if (!res.ok || data.success === false) {
                    if (data.error === "You must set a password before changing your email") {
                        throw new Error(
                            "You need to set a password in Security settings before changing your email."
                        );
                    }
                    throw new Error(data.error || "Failed to update email");
                }

                setSuccess("Verification link sent to your new email address.");
            } else if (!success) {
                setSuccess("Profile updated.");
            }

            if (onUpdated) {
                await onUpdated();
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveProfile = () => {
        setError(null);
        setSuccess(null);

        if (hasOAuthLink && email !== user.email) {
            if (!user.has_password) {
                setError(
                    "You need to set a password in Security settings before changing your email."
                );
                return;
            }
            setIsConfirmingEmailChange(true);
            return;
        }

        void submitProfileChanges();
    };

    const handleConfirmEmailChange = () => {
        void submitProfileChanges();
    };

    const handleSetPassword = async () => {
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${apiBase}/api/auth/me/set-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                throw new Error(data.error || "Failed to set password");
            }

            setSuccess("Password set successfully.");
            setCurrentPassword("");
            setNewPassword("");

            if (onUpdated) {
                await onUpdated();
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChangePassword = async () => {
        setError(null);
        setSuccess(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${apiBase}/api/auth/me/password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                throw new Error(data.error || "Failed to change password");
            }

            setSuccess("Password changed successfully.");
            setCurrentPassword("");
            setNewPassword("");

            if (onUpdated) {
                await onUpdated();
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEnableTwoFactor = () => {
        setError(null);
        setSuccess(null);
        setTwoFactorStep("enterPhone");
    };

    const handleSendTwoFactorCode = async () => {
        setError(null);
        setSuccess(null);

        const phoneForApi = normalizePhoneForApi(twoFactorPhoneInput);

        if (!phoneForApi) {
            setError("Please enter a valid phone number with country code.");
            return;
        }

        setIsTwoFactorSubmitting(true);
        try {
            const res = await fetch(`${apiBase}/api/auth/2fa/send-code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                },
                body: JSON.stringify({ phone: phoneForApi })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                throw new Error(data.error || "Failed to send verification code");
            }

            setSuccess("Verification code sent.");
            setTwoFactorStep("verify");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsTwoFactorSubmitting(false);
        }
    };

    const handleVerifyTwoFactorCode = async () => {
        setError(null);
        setSuccess(null);

        if (!twoFactorCode || twoFactorCode.length !== 6) {
            setError("Enter the 6-digit code you received.");
            return;
        }

        setIsTwoFactorSubmitting(true);
        try {
            const phoneForApi = normalizePhoneForApi(twoFactorPhoneInput);

            if (!phoneForApi) {
                setError("Please enter a valid phone number with country code.");
                return;
            }

            const res = await fetch(`${apiBase}/api/auth/2fa/verify/code`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                },
                body: JSON.stringify({ code: twoFactorCode, phone: phoneForApi })
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                throw new Error(data.error || "Failed to verify code");
            }

            if (onUpdated) {
                await onUpdated();
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsTwoFactorSubmitting(false);
        }
    };

    const handleDisableTwoFactor = async () => {
        setError(null);
        setSuccess(null);
        setIsConfirmingDisable2FA(false);
        setIsTwoFactorSubmitting(true);

        try {
            const res = await fetch(`${apiBase}/api/auth/2fa/disable`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`
                }
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) {
                throw new Error(data.error || "Failed to disable two-factor authentication");
            }

            if (onUpdated) {
                await onUpdated();
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setIsTwoFactorSubmitting(false);
        }
    };

    const isSecurity = mode === "security";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-lg bg-card border border-border p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isSecurity ? "Edit security" : "Edit profile"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                        {success}
                    </div>
                )}

                {!isSecurity ? (
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm text-muted-foreground mb-1">Name</label>
                            <input
                                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm text-muted-foreground mb-1">
                                Email
                            </label>
                            <input
                                className="w-full border border-border rounded px-3 py-2 text-sm bg-background disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:border-border"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={emailLockedByOAuth}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {emailLockedByOAuth
                                    ? `This account is linked with ${oauthProviderName}. Set a password in Security before changing your email.`
                                    : hasOAuthLink
                                      ? `Changing your email will unlink your ${oauthProviderName} connection.`
                                      : "Changing your email requires verification via a link sent to your new address."}
                            </p>
                        </div>

                        {isConfirmingEmailChange ? (
                            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
                                Changing your email while linked to {oauthProviderName} will unlink
                                your account from {oauthProviderName}. Do you want to continue?
                                <div className="mt-3 flex justify-end gap-2">
                                    <button
                                        onClick={() => setIsConfirmingEmailChange(false)}
                                        className="px-3 py-2 text-sm rounded border border-border text-muted-foreground hover:bg-muted"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmEmailChange}
                                        disabled={isSubmitting}
                                        className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                    >
                                        {isSubmitting ? "Saving..." : "Confirm email change"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    onClick={onClose}
                                    className="px-3 py-2 text-sm rounded border border-border text-muted-foreground hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSubmitting}
                                    className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {isSubmitting ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Password section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-foreground">Password</h3>
                            {user.has_password ? (
                                <>
                                    <div>
                                        <label className="block text-sm text-muted-foreground mb-1">
                                            Current password
                                        </label>
                                        <input
                                            type="password"
                                            className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-muted-foreground mb-1">
                                            New password
                                        </label>
                                        <input
                                            type="password"
                                            className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleChangePassword}
                                            disabled={isSubmitting}
                                            className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                        >
                                            {isSubmitting ? "Saving..." : "Change password"}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        You don't have a password set yet. Set one to secure your
                                        account and enable email changes.
                                    </p>
                                    <div>
                                        <label className="block text-sm text-muted-foreground mb-1">
                                            New password
                                        </label>
                                        <input
                                            type="password"
                                            className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSetPassword}
                                            disabled={isSubmitting}
                                            className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                        >
                                            {isSubmitting ? "Saving..." : "Set password"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Two-factor authentication */}
                        <div className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-medium text-foreground">
                                        Two-factor authentication
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Add a phone-based verification step when signing in.
                                    </p>
                                </div>
                                {user.two_factor_enabled ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                                        Enabled
                                    </span>
                                ) : null}
                            </div>

                            {user.two_factor_enabled ? (
                                <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Phone number
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {formatPhoneForDisplay(user.two_factor_phone) ||
                                                "Not provided"}
                                        </p>
                                    </div>
                                    {isConfirmingDisable2FA ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleDisableTwoFactor}
                                                disabled={isTwoFactorSubmitting}
                                                className="px-3 py-2 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
                                            >
                                                {isTwoFactorSubmitting ? "Disabling..." : "Confirm"}
                                            </button>
                                            <button
                                                onClick={() => setIsConfirmingDisable2FA(false)}
                                                disabled={isTwoFactorSubmitting}
                                                className="px-3 py-2 text-sm rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-60"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsConfirmingDisable2FA(true)}
                                            disabled={isTwoFactorSubmitting}
                                            className="px-3 py-2 text-sm rounded border border-border text-muted-foreground hover:bg-muted disabled:opacity-60"
                                        >
                                            Disable
                                        </button>
                                    )}
                                </div>
                            ) : twoFactorStep === "verify" ? (
                                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Enter the 6-digit code
                                            </p>
                                            <p className="text-sm text-foreground">
                                                Sent to{" "}
                                                {formatPhoneForDisplay(twoFactorPhoneInput) ||
                                                    "your phone"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setTwoFactorCode("");
                                                setTwoFactorStep("enterPhone");
                                            }}
                                            className="text-xs text-primary hover:text-primary/80"
                                            type="button"
                                            disabled={isTwoFactorSubmitting}
                                        >
                                            Change phone
                                        </button>
                                    </div>
                                    <input
                                        className="w-full border border-border rounded px-3 py-2 text-center tracking-[0.4em] text-lg font-semibold bg-background"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={twoFactorCode}
                                        onChange={(e) =>
                                            setTwoFactorCode(
                                                e.target.value.replace(/\D/g, "").slice(0, 6)
                                            )
                                        }
                                        placeholder="••••••"
                                    />
                                    <button
                                        onClick={handleVerifyTwoFactorCode}
                                        disabled={isTwoFactorSubmitting}
                                        className="w-full px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                    >
                                        {isTwoFactorSubmitting ? "Verifying..." : "Verify code"}
                                    </button>
                                </div>
                            ) : twoFactorStep === "enterPhone" ? (
                                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                                    <label className="block text-sm text-muted-foreground mb-1">
                                        Phone number
                                    </label>
                                    <input
                                        className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                                        value={twoFactorPhoneInput}
                                        onChange={(e) => {
                                            setTwoFactorPhoneInput(
                                                sanitizePhoneInput(e.target.value)
                                            );
                                        }}
                                        placeholder="+15551234567 or 447123456789"
                                    />
                                    <button
                                        onClick={handleSendTwoFactorCode}
                                        disabled={isTwoFactorSubmitting}
                                        className="w-full px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                    >
                                        {isTwoFactorSubmitting ? "Sending..." : "Send code"}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-3">
                                    <p className="text-sm text-muted-foreground">
                                        Protect your account with a one-time SMS code.
                                    </p>
                                    <button
                                        onClick={startEnableTwoFactor}
                                        className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        Enable
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-3 py-2 text-sm rounded border border-border text-muted-foreground hover:bg-muted"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
