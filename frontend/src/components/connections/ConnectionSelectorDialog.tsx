import { X, Plus, Check, ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { useConnectionStore } from "../../stores/connectionStore";
import { Button } from "../common/Button";
import type { Connection } from "../../lib/api";

interface ConnectionSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    provider: string;
    selectedConnectionId: string | null;
    onSelect: (connectionId: string) => void;
}

/**
 * Connection Selector Dialog
 * Shows a list of connections for a provider with ability to add new ones
 */
export function ConnectionSelectorDialog({
    isOpen,
    onClose,
    provider,
    selectedConnectionId,
    onSelect
}: ConnectionSelectorDialogProps) {
    const { connections, loading, fetchConnections } = useConnectionStore();

    // Filter connections for this provider
    const providerConnections = connections.filter(
        (conn) => conn.provider === provider && conn.status === "active"
    );

    // Get provider info
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    useEffect(() => {
        if (isOpen) {
            fetchConnections({ provider });
        }
    }, [isOpen, provider, fetchConnections]);

    const handleSelectConnection = (connectionId: string) => {
        onSelect(connectionId);
        onClose();
    };

    const handleAddNewConnection = () => {
        // Open connections page in new tab
        window.open("/connections", "_blank");
        // Refresh connections after a short delay
        setTimeout(() => {
            fetchConnections({ provider });
        }, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 !m-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 !m-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Select {providerInfo?.displayName || provider} Connection
                    </h2>
                    <Button variant="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-gray-600">Loading connections...</p>
                        </div>
                    ) : providerConnections.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                {providerInfo?.logoUrl ? (
                                    <img
                                        src={providerInfo.logoUrl}
                                        alt={providerInfo.displayName}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <Plus className="w-8 h-8 text-gray-400" />
                                )}
                            </div>
                            <h3 className="text-base font-medium text-gray-900 mb-2">
                                No connections found
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Create your first {providerInfo?.displayName || provider} connection
                                to get started
                            </p>
                            <Button variant="primary" onClick={handleAddNewConnection}>
                                <ExternalLink className="w-4 h-4" />
                                Go to Connections Page
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                                {providerConnections.map((connection) => (
                                    <ConnectionCard
                                        key={connection.id}
                                        connection={connection}
                                        isSelected={connection.id === selectedConnectionId}
                                        onSelect={() => handleSelectConnection(connection.id)}
                                        providerLogoUrl={providerInfo?.logoUrl}
                                    />
                                ))}
                            </div>

                            <Button
                                variant="secondary"
                                onClick={handleAddNewConnection}
                                className="w-full"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Add New Connection
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Connection Card Component
 */
interface ConnectionCardProps {
    connection: Connection;
    isSelected: boolean;
    onSelect: () => void;
    providerLogoUrl?: string;
}

function ConnectionCard({
    connection,
    isSelected,
    onSelect,
    providerLogoUrl
}: ConnectionCardProps) {
    const methodLabels: Record<string, string> = {
        oauth2: "OAuth",
        api_key: "API Key",
        mcp: "MCP",
        basic_auth: "Basic Auth",
        custom: "Custom"
    };

    const methodColors: Record<string, string> = {
        oauth2: "bg-purple-100 text-purple-700",
        api_key: "bg-blue-100 text-blue-700",
        mcp: "bg-indigo-100 text-indigo-700",
        basic_auth: "bg-gray-100 text-gray-700",
        custom: "bg-gray-100 text-gray-700"
    };

    return (
        <button
            onClick={onSelect}
            className={`
                w-full flex items-start gap-4 p-4 text-left border rounded-lg transition-all
                ${
                    isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-muted/30"
                }
            `}
            type="button"
        >
            {/* Provider Icon */}
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {providerLogoUrl ? (
                    <img
                        src={providerLogoUrl}
                        alt="Provider logo"
                        className="w-10 h-10 object-contain"
                    />
                ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                )}
            </div>

            {/* Connection Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                        {connection.name}
                    </h3>
                    <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            methodColors[connection.connection_method] || methodColors.custom
                        }`}
                    >
                        {methodLabels[connection.connection_method] || "Custom"}
                    </span>
                </div>

                {connection.metadata?.account_info?.email && (
                    <p className="text-xs text-gray-600 truncate">
                        {connection.metadata.account_info.email}
                    </p>
                )}
            </div>

            {/* Selection Indicator */}
            {isSelected && (
                <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                    </div>
                </div>
            )}
        </button>
    );
}
