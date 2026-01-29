import { useQuery } from "@tanstack/react-query";
import { Plus, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { ALL_PROVIDERS, type ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { NewConnectionDialog } from "../../../components/connections/dialogs/NewConnectionDialog";
import { ProviderConnectionDialog } from "../../../components/connections/dialogs/ProviderConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import {
    getProviderOperations,
    type OperationSummary,
    type OperationParameter
} from "../../../lib/api";
import { useConnectionStore } from "../../../stores/connectionStore";

interface IntegrationNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

/**
 * Dynamic Integration Node Config
 * Loads providers and operations dynamically from the backend
 */
export function IntegrationNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors = []
}: IntegrationNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;
    const [provider, setProvider] = useState((data.provider as string) || "");
    const [operation, setOperation] = useState((data.operation as string) || "");
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");
    const [parameters, setParameters] = useState<Record<string, unknown>>(
        (data.parameters as Record<string, unknown>) || {}
    );
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);
    const [isNewConnectionDialogOpen, setIsNewConnectionDialogOpen] = useState(false);

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections on mount and when provider changes
    useEffect(() => {
        if (provider) {
            fetchConnections({ provider });
        } else {
            fetchConnections();
        }
    }, [provider, fetchConnections]);

    // Load operations for selected provider (all operations - both read and write)
    const { data: operationsData, isLoading: operationsLoading } = useQuery({
        queryKey: ["provider-operations", provider],
        queryFn: () => getProviderOperations(provider),
        enabled: !!provider
    });

    const operations: OperationSummary[] = operationsData?.data?.operations || [];
    const selectedOperation = operations.find((op) => op.id === operation);

    // Get selected connection info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    // Auto-select first available connection when provider is set but no connection selected
    useEffect(() => {
        if (provider && !connectionId) {
            const availableConnections = connections.filter(
                (conn) => conn.provider === provider && conn.status === "active"
            );
            if (availableConnections.length > 0) {
                setConnectionId(availableConnections[0].id);
            }
        }
    }, [provider, connectionId, connections]);

    // Update parent component whenever config changes
    // Use useRef to track previous values and avoid infinite loops
    const prevConfigRef = useRef<string>("");
    const isInitialMount = useRef(true);

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const config = {
            provider,
            operation,
            connectionId,
            parameters,
            outputVariable
        };

        // Serialize config to compare - only update if actually changed
        const configString = JSON.stringify(config);
        if (configString !== prevConfigRef.current) {
            prevConfigRef.current = configString;
            onUpdate(config);
        }
    }, [provider, operation, connectionId, parameters, outputVariable]);

    // Handle parameter change
    const handleParameterChange = (paramName: string, value: unknown): void => {
        setParameters((prev) => ({
            ...prev,
            [paramName]: value
        }));
    };

    // Render form field based on parameter type
    const renderParameterField = (param: OperationParameter): React.ReactNode => {
        const value = parameters[param.name];

        // Determine field type based on parameter type
        if (param.type === "boolean") {
            return (
                <FormField key={param.name} label={param.name} description={param.description}>
                    <Select
                        value={value ? "true" : "false"}
                        onChange={(val) => handleParameterChange(param.name, val === "true")}
                        options={[
                            { value: "false", label: "False" },
                            { value: "true", label: "True" }
                        ]}
                    />
                </FormField>
            );
        }

        if (param.type === "number") {
            return (
                <FormField key={param.name} label={param.name} description={param.description}>
                    <Input
                        type="number"
                        value={(value as number) || ""}
                        onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
                        placeholder={param.description || `Enter ${param.name}`}
                        className="font-mono"
                    />
                </FormField>
            );
        }

        if (param.type === "object" || param.type === "array") {
            return (
                <FormField
                    key={param.name}
                    label={param.name}
                    description={param.description || "JSON object"}
                >
                    <Textarea
                        value={
                            typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)
                        }
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value);
                                handleParameterChange(param.name, parsed);
                            } catch {
                                // Keep as string if invalid JSON
                                handleParameterChange(param.name, e.target.value);
                            }
                        }}
                        placeholder={"{ ... } or {{variableName}}"}
                        rows={6}
                        className="font-mono"
                    />
                </FormField>
            );
        }

        // Default to text input for strings and unknown types
        return (
            <FormField key={param.name} label={param.name} description={param.description}>
                <Input
                    type="text"
                    value={(value as string) || ""}
                    onChange={(e) => handleParameterChange(param.name, e.target.value)}
                    placeholder={param.description || `Enter ${param.name}`}
                    className="font-mono"
                />
            </FormField>
        );
    };

    return (
        <>
            <FormSection title="Provider">
                <FormField label="Integration Provider" error={getError("connectionId")}>
                    {provider && selectedConnection ? (
                        // State 1: Provider selected with active connection
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-start gap-3 p-3 text-left border-2 border-border rounded-lg hover:border-border/60 hover:bg-muted transition-all"
                        >
                            {/* Provider Icon */}
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                {providerInfo?.logoUrl ? (
                                    <img
                                        src={providerInfo.logoUrl}
                                        alt={providerInfo.displayName}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-muted rounded" />
                                )}
                            </div>

                            {/* Connection Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm text-foreground">
                                        {providerInfo?.displayName || provider}
                                    </h3>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {selectedConnection.name}
                                </p>
                                {selectedConnection.metadata?.account_info?.email && (
                                    <p className="text-xs text-muted-foreground/80 truncate">
                                        {selectedConnection.metadata.account_info.email}
                                    </p>
                                )}
                            </div>
                        </button>
                    ) : provider && providerInfo ? (
                        // State 2: Provider pre-selected but no connection - show warning
                        <button
                            type="button"
                            onClick={() => setIsNewConnectionDialogOpen(true)}
                            className="w-full flex items-start gap-3 p-3 text-left border-2 border-amber-500/50 rounded-lg hover:border-amber-500 hover:bg-amber-500/5 transition-all"
                        >
                            {/* Provider Icon */}
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                {providerInfo.logoUrl ? (
                                    <img
                                        src={providerInfo.logoUrl}
                                        alt={providerInfo.displayName}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-muted rounded" />
                                )}
                            </div>

                            {/* Provider Info with Warning */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm text-foreground">
                                        {providerInfo.displayName}
                                    </h3>
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    No connection - click to connect
                                </p>
                            </div>
                        </button>
                    ) : (
                        // State 3: No provider selected
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 text-sm font-medium text-muted-foreground bg-muted/50 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            Select or Add Connection
                        </button>
                    )}
                </FormField>
            </FormSection>

            <FormSection title="Operation">
                {operationsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading operations...</p>
                ) : (
                    <FormField label="Action Type" error={getError("action")}>
                        <Select
                            value={operation}
                            onChange={(val) => {
                                setOperation(val);
                                setParameters({});
                            }}
                            placeholder={
                                operations.length === 0
                                    ? "No operations available"
                                    : "Select an operation..."
                            }
                            options={operations.map((op) => ({
                                value: op.id,
                                label: op.name
                            }))}
                        />
                        {selectedOperation?.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {selectedOperation.description}
                            </p>
                        )}
                    </FormField>
                )}
            </FormSection>

            {selectedOperation && selectedOperation.parameters.length > 0 && (
                <FormSection title="Parameters">
                    {selectedOperation.parameters.map((param) => renderParameterField(param))}
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Integration"}
                    nodeType="integration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

            {/* Provider Connection Dialog */}
            <ProviderConnectionDialog
                isOpen={isProviderDialogOpen}
                onClose={() => setIsProviderDialogOpen(false)}
                selectedConnectionId={connectionId}
                excludeCategories={["AI & ML"]}
                onSelect={(newProvider, newConnectionId) => {
                    setProvider(newProvider);
                    setConnectionId(newConnectionId);
                    setOperation("");
                    setParameters({});
                    setIsProviderDialogOpen(false);
                }}
            />

            {/* Direct New Connection Dialog for pre-selected providers */}
            {providerInfo && (
                <NewConnectionDialog
                    isOpen={isNewConnectionDialogOpen}
                    onClose={() => setIsNewConnectionDialogOpen(false)}
                    provider={provider}
                    providerDisplayName={providerInfo.displayName}
                    providerIcon={
                        providerInfo.logoUrl ? (
                            <img
                                src={providerInfo.logoUrl}
                                alt={providerInfo.displayName}
                                className="w-10 h-10 object-contain"
                            />
                        ) : undefined
                    }
                    onSuccess={() => {
                        setIsNewConnectionDialogOpen(false);
                        // Refresh connections to get the new one
                        fetchConnections({ provider });
                    }}
                    supportsOAuth={providerInfo.methods.includes("oauth2")}
                    supportsApiKey={providerInfo.methods.includes("api_key")}
                    oauthSettings={providerInfo.oauthSettings}
                />
            )}
        </>
    );
}
