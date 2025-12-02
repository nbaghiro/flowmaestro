import { X, Shield, Key, AlertTriangle } from "lucide-react";
import React, { useState } from "react";
import { Alert } from "../common/Alert";
import { Button } from "../common/Button";
import { ConfirmDialog } from "../common/ConfirmDialog";
import type { Connection } from "../../lib/api";

interface ConnectionDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    connection: Connection;
    providerDisplayName: string;
    providerIcon?: React.ReactNode;
    onDisconnect: (connectionId: string) => Promise<void>;
}

/**
 * Connection Details Dialog
 *
 * Shows connection information including:
 * - Authentication method (OAuth or API Key)
 * - Masked credentials
 * - Account information
 * - Disconnect option
 */
export function ConnectionDetailsDialog({
    isOpen,
    onClose,
    connection,
    providerDisplayName,
    providerIcon,
    onDisconnect
}: ConnectionDetailsDialogProps) {
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [showConfirmDisconnect, setShowConfirmDisconnect] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isOAuth = connection.connection_method === "oauth2";
    const isApiKey = connection.connection_method === "api_key";

    const handleDisconnect = async () => {
        setIsDisconnecting(true);
        setError(null);

        try {
            await onDisconnect(connection.id);
            setShowConfirmDisconnect(false);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to disconnect");
        } finally {
            setIsDisconnecting(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

                {/* Dialog */}
                <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-lg w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
                        <h2 className="text-lg font-semibold text-foreground">
                            Connection Details
                        </h2>
                        <Button variant="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Provider Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 flex-shrink-0">{providerIcon}</div>
                            <div>
                                <h3 className="font-medium text-foreground">
                                    {providerDisplayName}
                                </h3>
                                <p className="text-sm text-muted-foreground">{connection.name}</p>
                            </div>
                        </div>

                        {/* Authentication Method */}
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Authentication Method
                            </label>
                            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                                {isOAuth ? (
                                    <>
                                        <Shield className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-foreground">OAuth 2.0</span>
                                        <span className="ml-auto px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-400/20 rounded">
                                            OAUTH
                                        </span>
                                    </>
                                ) : isApiKey ? (
                                    <>
                                        <Key className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-foreground">API Key</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-foreground">
                                        {connection.connection_method}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* OAuth Account Info */}
                        {isOAuth && connection.metadata?.account_info && (
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    Connected Account
                                </label>
                                <div className="p-3 bg-muted/30 rounded-md space-y-1">
                                    {connection.metadata.account_info.email && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Email: </span>
                                            <span className="text-foreground">
                                                {connection.metadata.account_info.email}
                                            </span>
                                        </div>
                                    )}
                                    {connection.metadata.account_info.username && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">
                                                Username:{" "}
                                            </span>
                                            <span className="text-foreground">
                                                {connection.metadata.account_info.username}
                                            </span>
                                        </div>
                                    )}
                                    {connection.metadata.account_info.workspace && (
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">
                                                Workspace:{" "}
                                            </span>
                                            <span className="text-foreground">
                                                {connection.metadata.account_info.workspace}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* API Key (masked) */}
                        {isApiKey && (
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-2">
                                    API Key
                                </label>
                                <div className="p-3 bg-muted/30 rounded-md">
                                    <code className="text-sm text-foreground font-mono">
                                        ••••••••••••••••
                                    </code>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        API keys are encrypted and cannot be displayed
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                                Status
                            </label>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md ${
                                        connection.status === "active"
                                            ? "bg-green-500/10 dark:bg-green-400/20 text-green-700 dark:text-green-400"
                                            : connection.status === "expired"
                                              ? "bg-amber-500/10 dark:bg-amber-400/20 text-amber-700 dark:text-amber-400"
                                              : "bg-red-500/10 dark:bg-red-400/20 text-red-700 dark:text-red-400"
                                    }`}
                                >
                                    {connection.status.charAt(0).toUpperCase() +
                                        connection.status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Created
                                </label>
                                <p className="text-sm text-foreground">
                                    {formatDate(connection.created_at)}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">
                                    Last Used
                                </label>
                                <p className="text-sm text-foreground">
                                    {formatDate(connection.last_used_at)}
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && <Alert variant="error">{error}</Alert>}

                        {/* Disconnect Button */}
                        <div className="pt-4 border-t border-border">
                            <Button
                                variant="destructive"
                                onClick={() => setShowConfirmDisconnect(true)}
                                disabled={isDisconnecting}
                                className="w-full"
                            >
                                <AlertTriangle className="w-4 h-4" />
                                Disconnect {providerDisplayName}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                You can reconnect to a different account anytime
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Disconnect Dialog */}
            <ConfirmDialog
                isOpen={showConfirmDisconnect}
                onClose={() => setShowConfirmDisconnect(false)}
                onConfirm={handleDisconnect}
                title="Disconnect Integration"
                message={`Are you sure you want to disconnect ${providerDisplayName}? This will remove access to your ${providerDisplayName} account.`}
                confirmText="Disconnect"
                cancelText="Cancel"
                variant="danger"
            />
        </>
    );
}
