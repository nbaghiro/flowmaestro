import { Link2, Check, Plus, AlertCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { getConnections } from "../../../lib/api";
import type { Connection, PersonaConnectionRequirement } from "../../../lib/api";

interface SelectedConnection {
    connection_id: string;
    scopes?: string[];
}

interface ConnectionSelectorProps {
    requirements: PersonaConnectionRequirement[];
    selectedConnections: SelectedConnection[];
    onConnectionsChange: (connections: SelectedConnection[]) => void;
    disabled?: boolean;
}

/**
 * Component to select which connections to grant to a persona instance
 */
export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
    requirements,
    selectedConnections,
    onConnectionsChange,
    disabled = false
}) => {
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Group connections by provider
    const connectionsByProvider = React.useMemo(() => {
        const map = new Map<string, Connection[]>();
        for (const conn of connections) {
            const existing = map.get(conn.provider) || [];
            existing.push(conn);
            map.set(conn.provider, existing);
        }
        return map;
    }, [connections]);

    // Load available connections
    useEffect(() => {
        const loadConnections = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await getConnections();
                setConnections(response.data || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load connections");
            } finally {
                setIsLoading(false);
            }
        };

        loadConnections();
    }, []);

    const isConnectionSelected = (connectionId: string): boolean => {
        return selectedConnections.some((c) => c.connection_id === connectionId);
    };

    const toggleConnection = (
        connection: Connection,
        requirement?: PersonaConnectionRequirement
    ) => {
        if (disabled) return;

        const isSelected = isConnectionSelected(connection.id);
        if (isSelected) {
            onConnectionsChange(
                selectedConnections.filter((c) => c.connection_id !== connection.id)
            );
        } else {
            onConnectionsChange([
                ...selectedConnections,
                {
                    connection_id: connection.id,
                    scopes: requirement?.suggested_scopes
                }
            ]);
        }
    };

    // Check if required connections are satisfied
    const missingRequired = requirements
        .filter((req) => req.required)
        .filter((req) => {
            const providerConnections = connectionsByProvider.get(req.provider) || [];
            return !providerConnections.some((conn) => isConnectionSelected(conn.id));
        });

    if (requirements.length === 0) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="text-sm text-muted-foreground">Loading available connections...</div>
        );
    }

    if (error) {
        return (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg text-sm">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Required connections warning */}
            {missingRequired.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                            Required connections missing
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                            This persona requires access to:{" "}
                            {missingRequired.map((r) => r.provider).join(", ")}
                        </p>
                    </div>
                </div>
            )}

            {/* Connection requirements */}
            {requirements.map((requirement) => {
                const providerConnections = connectionsByProvider.get(requirement.provider) || [];
                const hasConnections = providerConnections.length > 0;

                return (
                    <div
                        key={requirement.provider}
                        className="border border-border rounded-lg overflow-hidden"
                    >
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-sm text-foreground capitalize">
                                        {requirement.provider}
                                    </span>
                                    {requirement.required && (
                                        <span className="text-xs text-red-500 font-medium">
                                            Required
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {requirement.reason}
                            </p>
                        </div>

                        <div className="p-3">
                            {hasConnections ? (
                                <div className="space-y-2">
                                    {providerConnections.map((connection) => {
                                        const isSelected = isConnectionSelected(connection.id);
                                        return (
                                            <button
                                                key={connection.id}
                                                type="button"
                                                onClick={() =>
                                                    toggleConnection(connection, requirement)
                                                }
                                                disabled={disabled}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                                                    isSelected
                                                        ? "bg-primary/10 border-primary text-foreground"
                                                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                                                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                                                            isSelected
                                                                ? "bg-primary border-primary"
                                                                : "border-border"
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <Check className="w-3 h-3 text-primary-foreground" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm">
                                                        {connection.name}
                                                    </span>
                                                </div>
                                                {connection.metadata?.account_info?.email && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {connection.metadata.account_info.email}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-3">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        No {requirement.provider} connections available
                                    </p>
                                    <a
                                        href="/connections"
                                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Connect {requirement.provider}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ConnectionSelector;
