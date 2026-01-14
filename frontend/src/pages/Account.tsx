import { User, Lock, Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { PageHeader } from "../components/common/PageHeader";
import {
    getGoogleAuthUrl,
    getMicrosoftAuthUrl,
    unlinkGoogleAccount,
    unlinkMicrosoftAccount
} from "../lib/api";
import { logger } from "../lib/logger";
import { useAuthStore } from "../stores/authStore";
import type { LucideIcon } from "lucide-react";
import { AccountEditModal } from "@/components/AccountEditModal";

interface AccountSection {
    icon: LucideIcon;
    title: string;
    description: string;
    fields: Array<{ label: string; value: string | React.ReactNode }>;
}

export function Account() {
    const { user, refreshUser } = useAuthStore();
    const [isUnlinkGoogleDialogOpen, setIsUnlinkGoogleDialogOpen] = useState(false);
    const [isUnlinkMicrosoftDialogOpen, setIsUnlinkMicrosoftDialogOpen] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [activeEditModal, setActiveEditModal] = useState<null | "profile" | "security">(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const successTimeoutRef = useRef<number | null>(null);

    const isGoogleConnected = !!user?.google_id;
    const isMicrosoftConnected = !!user?.microsoft_id;
    const hasPassword = !!user?.has_password;

    // Check if user can unlink an OAuth provider (must have another auth method)
    const canUnlinkGoogle = hasPassword || isMicrosoftConnected;
    const canUnlinkMicrosoft = hasPassword || isGoogleConnected;

    const handleConnectGoogle = () => {
        window.location.href = getGoogleAuthUrl();
    };

    const handleConnectMicrosoft = () => {
        window.location.href = getMicrosoftAuthUrl();
    };

    const handleUnlinkGoogle = async () => {
        setIsUnlinking(true);
        try {
            await unlinkGoogleAccount();
            window.location.reload();
        } catch (error) {
            logger.error("Failed to unlink Google", error);
        } finally {
            setIsUnlinking(false);
            setIsUnlinkGoogleDialogOpen(false);
        }
    };

    const handleUnlinkMicrosoft = async () => {
        setIsUnlinking(true);
        try {
            await unlinkMicrosoftAccount();
            window.location.reload();
        } catch (error) {
            logger.error("Failed to unlink Microsoft", error);
        } finally {
            setIsUnlinking(false);
            setIsUnlinkMicrosoftDialogOpen(false);
        }
    };

    const handleModalUpdated = async () => {
        await refreshUser();
        setShowSuccess(true);
        if (successTimeoutRef.current) {
            clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = window.setTimeout(() => setShowSuccess(false), 4000);
    };

    useEffect(() => {
        return () => {
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, []);

    const accountSections: AccountSection[] = [
        {
            icon: User,
            title: "Profile",
            description: "Manage your personal information",
            fields: [
                { label: "Name", value: user?.name || "Not set" },
                { label: "Email", value: user?.email || "Not set" }
            ]
        },
        {
            icon: Lock,
            title: "Security",
            description: "Password and authentication settings",
            fields: [
                { label: "Password", value: hasPassword ? "••••••••" : "Not set" },
                {
                    label: "Two-factor authentication",
                    value: user?.two_factor_enabled ? (
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Enabled
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Disabled</span>
                    )
                },
                {
                    label: "Google Account",
                    value: (
                        <div className="flex items-center gap-2">
                            {isGoogleConnected ? (
                                <>
                                    <span className="text-sm text-green-600 font-medium">
                                        Connected
                                    </span>
                                    <button
                                        onClick={() => setIsUnlinkGoogleDialogOpen(true)}
                                        className="text-xs text-red-600 hover:text-red-700 underline"
                                    >
                                        Disconnect
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm text-muted-foreground">
                                        Not connected
                                    </span>
                                    <button
                                        onClick={handleConnectGoogle}
                                        className="text-xs text-primary hover:text-primary/80 underline"
                                    >
                                        Connect
                                    </button>
                                </>
                            )}
                        </div>
                    )
                },
                {
                    label: "Microsoft Account",
                    value: (
                        <div className="flex items-center gap-2">
                            {isMicrosoftConnected ? (
                                <>
                                    <span className="text-sm text-green-600 font-medium">
                                        Connected
                                    </span>
                                    <button
                                        onClick={() => setIsUnlinkMicrosoftDialogOpen(true)}
                                        className="text-xs text-red-600 hover:text-red-700 underline"
                                    >
                                        Disconnect
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="text-sm text-muted-foreground">
                                        Not connected
                                    </span>
                                    <button
                                        onClick={handleConnectMicrosoft}
                                        className="text-xs text-primary hover:text-primary/80 underline"
                                    >
                                        Connect
                                    </button>
                                </>
                            )}
                        </div>
                    )
                }
            ]
        },
        {
            icon: Bell,
            title: "Preferences",
            description: "Communication and privacy preferences",
            fields: [
                { label: "Email notifications", value: "Enabled" },
                { label: "Privacy settings", value: "Default" }
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
            {showSuccess && (
                <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    Changes saved successfully.
                </div>
            )}
            <PageHeader
                title="Account"
                description="Manage your account settings and preferences"
            />

            <div className="space-y-6">
                {accountSections.map((section) => {
                    const Icon = section.icon;
                    return (
                        <div
                            key={section.title}
                            className="bg-card border border-border rounded-lg p-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-foreground mb-1">
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {section.description}
                                    </p>
                                    <div className="space-y-3">
                                        {section.fields.map((field) => (
                                            <div
                                                key={field.label}
                                                className="flex items-center justify-between py-2"
                                            >
                                                <span className="text-sm text-muted-foreground">
                                                    {field.label}
                                                </span>
                                                <div className="text-sm text-foreground font-medium">
                                                    {field.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
                                        onClick={() => {
                                            if (section.title === "Profile") {
                                                setActiveEditModal("profile");
                                            } else if (section.title === "Security") {
                                                setActiveEditModal("security");
                                            }
                                        }}
                                    >
                                        Edit {section.title.toLowerCase()} →
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {activeEditModal && user && (
                <AccountEditModal
                    isOpen={!!activeEditModal}
                    mode={activeEditModal}
                    user={user}
                    onClose={() => setActiveEditModal(null)}
                    onUpdated={handleModalUpdated}
                />
            )}

            {/* Google Unlink Dialog */}
            {canUnlinkGoogle ? (
                <ConfirmDialog
                    isOpen={isUnlinkGoogleDialogOpen}
                    onClose={() => setIsUnlinkGoogleDialogOpen(false)}
                    onConfirm={handleUnlinkGoogle}
                    title="Disconnect Google Account"
                    message="Are you sure you want to disconnect your Google account? You can still sign in with your other authentication methods."
                    confirmText={isUnlinking ? "Disconnecting..." : "Disconnect"}
                    cancelText="Cancel"
                    variant="danger"
                />
            ) : (
                <ConfirmDialog
                    isOpen={isUnlinkGoogleDialogOpen}
                    onClose={() => setIsUnlinkGoogleDialogOpen(false)}
                    onConfirm={() => setIsUnlinkGoogleDialogOpen(false)}
                    title="Cannot Disconnect Google"
                    message="You cannot disconnect Google as it's your only sign-in method. Please set a password or connect another account first."
                    confirmText="OK"
                    variant="danger"
                />
            )}

            {/* Microsoft Unlink Dialog */}
            {canUnlinkMicrosoft ? (
                <ConfirmDialog
                    isOpen={isUnlinkMicrosoftDialogOpen}
                    onClose={() => setIsUnlinkMicrosoftDialogOpen(false)}
                    onConfirm={handleUnlinkMicrosoft}
                    title="Disconnect Microsoft Account"
                    message="Are you sure you want to disconnect your Microsoft account? You can still sign in with your other authentication methods."
                    confirmText={isUnlinking ? "Disconnecting..." : "Disconnect"}
                    cancelText="Cancel"
                    variant="danger"
                />
            ) : (
                <ConfirmDialog
                    isOpen={isUnlinkMicrosoftDialogOpen}
                    onClose={() => setIsUnlinkMicrosoftDialogOpen(false)}
                    onConfirm={() => setIsUnlinkMicrosoftDialogOpen(false)}
                    title="Cannot Disconnect Microsoft"
                    message="You cannot disconnect Microsoft as it's your only sign-in method. Please set a password or connect another account first."
                    confirmText="OK"
                    variant="danger"
                />
            )}
        </div>
    );
}
