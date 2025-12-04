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
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isConfirmingEmailChange, setIsConfirmingEmailChange] = useState(false);

    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001";
    const hasOAuthLink = Boolean(user.google_id || user.microsoft_id);
    const oauthProviderName = user.google_id
        ? "Google"
        : user.microsoft_id
          ? "Microsoft"
          : "OAuth provider";
    const emailLockedByOAuth = hasOAuthLink && !user.has_password;

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

                        {/* 2FA placeholder */}
                        <div className="space-y-2 border-t border-border pt-4">
                            <h3 className="text-sm font-medium text-foreground">
                                Two-factor authentication
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Two-factor authentication will be available in a future update.
                            </p>
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
