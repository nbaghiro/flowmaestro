import { Plus, Key, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { ConnectionMethod } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useConnectionStore } from "../../stores/connectionStore";
import { Button } from "../common/Button";
import { Select } from "../common/Select";
import { NewConnectionDialog } from "./NewConnectionDialog";

interface ConnectionPickerProps {
    provider: string;
    value: string | null;
    onChange: (connectionId: string | null) => void;
    label?: string;
    description?: string;
    required?: boolean;
    connectionMethod?: ConnectionMethod; // Optional: filter by connection method
    allowedMethods?: ConnectionMethod[]; // Optional: limit to specific methods
}

const methodBadgeConfig: Record<ConnectionMethod, { label: string; className: string }> = {
    api_key: {
        label: "API Key",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    },
    oauth2: {
        label: "OAuth",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
    },
    basic_auth: {
        label: "Basic Auth",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    },
    custom: {
        label: "Custom",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
    }
};

export function ConnectionPicker({
    provider,
    value,
    onChange,
    label = "Connection",
    description,
    required = false,
    connectionMethod,
    allowedMethods
}: ConnectionPickerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { connections } = useConnectionStore();
    // No need to fetch with filter - use existing connections and filter locally

    // Filter connections by provider and optionally by method
    const providerConnections = connections.filter((conn) => {
        if (conn.provider !== provider) return false;
        if (conn.status !== "active") return false;

        // Filter by specific connection method if provided
        if (connectionMethod && conn.connection_method !== connectionMethod) {
            return false;
        }

        // Filter by allowed methods if provided
        if (allowedMethods && !allowedMethods.includes(conn.connection_method)) {
            return false;
        }

        return true;
    });

    const selectedConnection = providerConnections.find((conn) => conn.id === value);

    const getProviderName = (provider: string): string => {
        const names: Record<string, string> = {
            openai: "OpenAI",
            anthropic: "Anthropic",
            google: "Google",
            slack: "Slack",
            github: "GitHub",
            notion: "Notion",
            filesystem: "Filesystem",
            postgres: "PostgreSQL",
            mongodb: "MongoDB"
        };
        return names[provider] || provider;
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{description}</p>
            )}

            {providerConnections.length === 0 ? (
                <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                        <Key className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No {getProviderName(provider)} connections found
                        </p>
                        <Button
                            variant="secondary"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="text-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add {getProviderName(provider)} Connection
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <Select
                        value={value || ""}
                        onChange={(val) => onChange(val || null)}
                        options={[
                            { value: "", label: "Select a connection" },
                            ...providerConnections.map((conn) => {
                                // Clean up connection name by removing "unknown@" pattern
                                const cleanName = conn.name
                                    .replace(/\s*-?\s*unknown@\w+/gi, "")
                                    .trim();
                                const displayName = cleanName || conn.name;
                                const emailSuffix =
                                    conn.metadata?.account_info?.email &&
                                    !conn.metadata.account_info.email.includes("unknown")
                                        ? ` (${conn.metadata.account_info.email})`
                                        : "";

                                return {
                                    value: conn.id,
                                    label: displayName + emailSuffix
                                };
                            })
                        ]}
                    />

                    {/* Show method badge for selected connection */}
                    {selectedConnection && (
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                                    methodBadgeConfig[selectedConnection.connection_method]
                                        .className
                                )}
                            >
                                {methodBadgeConfig[selectedConnection.connection_method].label}
                            </span>

                            {/* OAuth expiry warning */}
                            {selectedConnection.connection_method === "oauth2" &&
                                selectedConnection.metadata?.expires_at &&
                                Date.now() > selectedConnection.metadata.expires_at && (
                                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        Expired
                                    </span>
                                )}
                        </div>
                    )}

                    {selectedConnection && selectedConnection.status !== "active" && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-400">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>
                                This connection has status: {selectedConnection.status}. Please test
                                it in the Connections page.
                            </span>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        onClick={() => setIsAddDialogOpen(true)}
                        className="text-xs p-0 h-auto"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add new connection
                    </Button>
                </div>
            )}

            {(() => {
                const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);
                if (!providerInfo) return null;

                return (
                    <NewConnectionDialog
                        isOpen={isAddDialogOpen}
                        onClose={() => {
                            setIsAddDialogOpen(false);
                        }}
                        provider={provider}
                        providerDisplayName={providerInfo.displayName}
                        providerIcon={
                            <img
                                src={providerInfo.logoUrl}
                                alt={providerInfo.displayName}
                                className="w-10 h-10 object-contain"
                            />
                        }
                        onSuccess={() => {
                            setIsAddDialogOpen(false);
                        }}
                        supportsOAuth={providerInfo.methods.includes("oauth2")}
                        supportsApiKey={providerInfo.methods.includes("api_key")}
                        oauthSettings={providerInfo.oauthSettings}
                    />
                );
            })()}
        </div>
    );
}
