import { Plus, Check, ExternalLink } from "lucide-react";
import { ALL_PROVIDERS } from "@flowmaestro/shared";
import { useConnectionStore } from "../../../stores/connectionStore";
import { Button } from "../../common/Button";
import { Dialog } from "../../common/Dialog";
import type { Connection } from "../../../lib/api";

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
    const { getByProvider } = useConnectionStore();

    // Filter connections for this provider locally - no need to refetch
    const providerConnections = getByProvider(provider).filter((conn) => conn.status === "active");

    // Get provider info
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    const handleSelectConnection = (connectionId: string) => {
        onSelect(connectionId);
        onClose();
    };

    const handleAddNewConnection = () => {
        // Open connections page in new tab
        window.open("/connections", "_blank");
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Select ${providerInfo?.displayName || provider} Connection`}
            size="2xl"
        >
            {providerConnections.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        {providerInfo?.logoUrl ? (
                            <img
                                src={providerInfo.logoUrl}
                                alt={providerInfo.displayName}
                                className="w-10 h-10 object-contain"
                            />
                        ) : (
                            <Plus className="w-8 h-8 text-muted-foreground" />
                        )}
                    </div>
                    <h3 className="text-base font-medium text-foreground mb-2">
                        No connections found
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Create your first {providerInfo?.displayName || provider} connection to get
                        started
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

                    <Button variant="secondary" onClick={handleAddNewConnection} className="w-full">
                        <ExternalLink className="w-4 h-4" />
                        Add New Connection
                    </Button>
                </>
            )}
        </Dialog>
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
        oauth2: "bg-purple-900/30 text-purple-400",
        api_key: "bg-blue-900/30 text-blue-400",
        mcp: "bg-indigo-900/30 text-indigo-400",
        basic_auth: "bg-muted text-muted-foreground",
        custom: "bg-muted text-muted-foreground"
    };

    return (
        <button
            onClick={onSelect}
            className={`
                w-full flex items-start gap-4 p-4 text-left border rounded-lg transition-all
                ${
                    isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-accent"
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
                    <div className="w-10 h-10 bg-muted rounded-lg" />
                )}
            </div>

            {/* Connection Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-sm text-foreground truncate">
                        {connection.name}
                    </h3>
                    <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${
                            methodColors[connection.connection_method] || methodColors.custom
                        }`}
                    >
                        {methodLabels[connection.connection_method] || "Custom"}
                    </span>
                    {connection.metadata?.isTestConnection && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-amber-900/30 text-amber-400">
                            Test
                        </span>
                    )}
                </div>

                {connection.metadata?.account_info?.email && (
                    <p className="text-xs text-muted-foreground truncate">
                        {connection.metadata.account_info.email}
                    </p>
                )}
            </div>

            {/* Selection Indicator */}
            {isSelected && (
                <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                </div>
            )}
        </button>
    );
}
