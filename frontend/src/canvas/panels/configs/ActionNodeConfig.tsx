/**
 * Action Node Configuration Panel
 * Multi-step flow for selecting provider, action, and configuring parameters
 */

import { ChevronLeft, Play, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { ALL_PROVIDERS, type ValidationError } from "@flowmaestro/shared";
import { ActionOperationList } from "../../../components/actions/ActionOperationList";
import {
    ActionProviderList,
    type ActionProviderSummary
} from "../../../components/actions/ActionProviderList";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { NewConnectionDialog } from "../../../components/connections/NewConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { cn } from "../../../lib/utils";
import { useConnectionStore } from "../../../stores/connectionStore";
import type { OperationSummary, OperationParameter } from "../../../lib/api";

export interface ActionNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

// View states for the multi-step flow
type ViewState = "provider-list" | "operation-list" | "operation-config";

export function ActionNodeConfig({ data, onUpdate, errors: _errors }: ActionNodeConfigProps) {
    // Use ref to avoid infinite update loops when onUpdate changes
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    // Provider and operation state
    const [selectedProvider, setSelectedProvider] = useState<ActionProviderSummary | null>(
        data.provider
            ? ({
                  providerId: data.provider as string,
                  name: (data.providerName as string) || (data.provider as string),
                  description: "",
                  logoUrl: ALL_PROVIDERS.find((p) => p.provider === data.provider)?.logoUrl,
                  category: "",
                  actionCount: 0
              } as ActionProviderSummary)
            : null
    );
    const [selectedOperation, setSelectedOperation] = useState<OperationSummary | null>(
        data.operation
            ? ({
                  id: data.operation as string,
                  name: (data.operationName as string) || (data.operation as string),
                  description: "",
                  actionType: "write",
                  parameters: (data.operationParameters as OperationParameter[]) || [],
                  inputSchemaJSON: {}
              } as OperationSummary)
            : null
    );
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");
    const [parameters, setParameters] = useState<Record<string, unknown>>(
        (data.parameters as Record<string, unknown>) || {}
    );
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    // Connection dialog state
    const [isNewConnectionDialogOpen, setIsNewConnectionDialogOpen] = useState(false);

    // Multi-step view state
    const [viewState, setViewState] = useState<ViewState>(() => {
        if (selectedOperation) return "operation-config";
        if (selectedProvider) return "operation-list";
        return "provider-list";
    });

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections when provider changes
    useEffect(() => {
        if (selectedProvider) {
            fetchConnections({ provider: selectedProvider.providerId });
        }
    }, [selectedProvider, fetchConnections]);

    // Auto-select first connection when available
    useEffect(() => {
        if (selectedProvider && !connectionId) {
            const availableConnections = connections.filter(
                (conn) => conn.provider === selectedProvider.providerId && conn.status === "active"
            );
            if (availableConnections.length > 0) {
                setConnectionId(availableConnections[0].id);
            }
        }
    }, [selectedProvider, connectionId, connections]);

    // Get selected connection and provider info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = selectedProvider
        ? ALL_PROVIDERS.find((p) => p.provider === selectedProvider.providerId)
        : null;

    // Build and send config to parent
    const updateConfig = useCallback(() => {
        const config: Record<string, unknown> = {};

        if (selectedProvider && selectedOperation) {
            config.provider = selectedProvider.providerId;
            config.providerName = selectedProvider.name;
            config.operation = selectedOperation.id;
            config.operationName = selectedOperation.name;
            config.operationParameters = selectedOperation.parameters;
            config.connectionId = connectionId;
            config.parameters = parameters;
            config.outputVariable = outputVariable;
            // For display purposes
            config.label = selectedOperation.name;
        }

        onUpdateRef.current(config);
    }, [selectedProvider, selectedOperation, connectionId, parameters, outputVariable]);

    useEffect(() => {
        updateConfig();
    }, [updateConfig]);

    const handleSelectProvider = (provider: ActionProviderSummary) => {
        setSelectedProvider(provider);
        setSelectedOperation(null);
        setConnectionId("");
        setParameters({});
        setViewState("operation-list");
    };

    const handleSelectOperation = (operation: OperationSummary) => {
        setSelectedOperation(operation);
        // Initialize parameters with default values
        const initialParams: Record<string, unknown> = {};
        if (operation.parameters) {
            for (const param of operation.parameters) {
                if (param.default !== undefined) {
                    initialParams[param.name] = param.default;
                }
            }
        }
        setParameters(initialParams);
        setViewState("operation-config");
    };

    const handleBackToProviders = () => {
        setSelectedProvider(null);
        setSelectedOperation(null);
        setConnectionId("");
        setParameters({});
        setViewState("provider-list");
    };

    const handleBackToOperations = () => {
        setSelectedOperation(null);
        setParameters({});
        setViewState("operation-list");
    };

    const handleParameterChange = (paramName: string, value: unknown) => {
        setParameters((prev) => ({ ...prev, [paramName]: value }));
    };

    // Render provider selection
    if (viewState === "provider-list") {
        return (
            <FormSection title="Select Integration">
                <p className="text-sm text-muted-foreground mb-3">
                    Please select an integration to perform an action.
                </p>
                <ActionProviderList onSelectProvider={handleSelectProvider} />
            </FormSection>
        );
    }

    // Render operation selection
    if (viewState === "operation-list" && selectedProvider) {
        return (
            <FormSection title="Select Action">
                <ActionOperationList
                    provider={selectedProvider}
                    onSelectOperation={handleSelectOperation}
                    onBack={handleBackToProviders}
                />
            </FormSection>
        );
    }

    // Render operation configuration
    if (viewState === "operation-config" && selectedProvider && selectedOperation) {
        return (
            <ActionOperationConfig
                provider={selectedProvider}
                operation={selectedOperation}
                connectionId={connectionId}
                selectedConnection={selectedConnection}
                providerInfo={providerInfo}
                parameters={parameters}
                outputVariable={outputVariable}
                onParameterChange={handleParameterChange}
                onOutputVariableChange={setOutputVariable}
                onConnectionChange={setConnectionId}
                onBackToOperations={handleBackToOperations}
                onBackToProviders={handleBackToProviders}
                onOpenConnectionDialog={() => setIsNewConnectionDialogOpen(true)}
                isNewConnectionDialogOpen={isNewConnectionDialogOpen}
                onCloseConnectionDialog={() => setIsNewConnectionDialogOpen(false)}
                onConnectionCreated={() => {
                    setIsNewConnectionDialogOpen(false);
                    if (selectedProvider) {
                        fetchConnections({ provider: selectedProvider.providerId });
                    }
                }}
            />
        );
    }

    // Fallback
    return (
        <FormSection title="Select Integration">
            <p className="text-sm text-muted-foreground mb-3">
                Please select an integration to perform an action.
            </p>
            <ActionProviderList onSelectProvider={handleSelectProvider} />
        </FormSection>
    );
}

// Action Operation Configuration Component
interface ActionOperationConfigProps {
    provider: ActionProviderSummary;
    operation: OperationSummary;
    connectionId: string;
    selectedConnection:
        | { id: string; name: string; metadata?: Record<string, unknown> }
        | undefined;
    providerInfo:
        | { displayName: string; logoUrl?: string; methods: string[]; oauthSettings?: unknown[] }
        | null
        | undefined;
    parameters: Record<string, unknown>;
    outputVariable: string;
    onParameterChange: (paramName: string, value: unknown) => void;
    onOutputVariableChange: (value: string) => void;
    onConnectionChange: (connectionId: string) => void;
    onBackToOperations: () => void;
    onBackToProviders: () => void;
    onOpenConnectionDialog: () => void;
    isNewConnectionDialogOpen: boolean;
    onCloseConnectionDialog: () => void;
    onConnectionCreated: () => void;
}

function ActionOperationConfig({
    provider,
    operation,
    connectionId: _connectionId,
    selectedConnection,
    providerInfo,
    parameters,
    outputVariable,
    onParameterChange,
    onOutputVariableChange,
    onBackToOperations,
    onBackToProviders,
    onOpenConnectionDialog,
    isNewConnectionDialogOpen,
    onCloseConnectionDialog,
    onConnectionCreated
}: ActionOperationConfigProps) {
    const [imageError, setImageError] = useState(false);

    // Format operation name for display
    const formatOperationName = (name: string): string => {
        let formatted = name.replace(/_/g, " ");
        formatted = formatted.replace(/([A-Z])/g, " $1");
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
    };

    return (
        <>
            <FormSection title="Action Configuration">
                {/* Header with provider/operation info */}
                <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {imageError || !provider.logoUrl ? (
                                <Play className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <img
                                    src={provider.logoUrl}
                                    alt={provider.name}
                                    className="w-6 h-6 object-contain"
                                    onError={() => setImageError(true)}
                                />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-medium text-sm">
                                {formatOperationName(operation.name)}
                            </h3>
                            <p className="text-xs text-muted-foreground">{provider.name}</p>
                        </div>
                    </div>
                    {operation.description && (
                        <p className="text-xs text-muted-foreground mt-2">
                            {operation.description}
                        </p>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={onBackToOperations}
                            className={cn(
                                "text-xs px-2 py-1 rounded",
                                "bg-muted hover:bg-muted/80 transition-colors",
                                "flex items-center gap-1"
                            )}
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Change action
                        </button>
                        <button
                            onClick={onBackToProviders}
                            className={cn(
                                "text-xs px-2 py-1 rounded",
                                "bg-muted hover:bg-muted/80 transition-colors",
                                "flex items-center gap-1"
                            )}
                        >
                            <ChevronLeft className="w-3 h-3" />
                            Change provider
                        </button>
                    </div>
                </div>

                {/* Connection Status */}
                {!selectedConnection ? (
                    <button
                        onClick={onOpenConnectionDialog}
                        className="w-full flex items-start gap-3 p-3 text-left border-2 border-amber-500/50 rounded-lg hover:border-amber-500 hover:bg-amber-500/5 transition-all mt-3"
                    >
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                            {provider.logoUrl && !imageError ? (
                                <img
                                    src={provider.logoUrl}
                                    alt={provider.name}
                                    className="w-10 h-10 object-contain"
                                />
                            ) : (
                                <div className="w-10 h-10 bg-muted rounded" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-sm text-foreground">
                                    {provider.name}
                                </h3>
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                No connection - click to connect
                            </p>
                        </div>
                    </button>
                ) : (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg mt-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs text-green-600 dark:text-green-400">
                                Connected: {selectedConnection.name}
                            </span>
                        </div>
                    </div>
                )}
            </FormSection>

            {/* Parameters Section */}
            {operation.parameters && operation.parameters.length > 0 && (
                <FormSection title="Parameters">
                    {operation.parameters.map((param) => (
                        <ParameterField
                            key={param.name}
                            param={param}
                            value={parameters[param.name]}
                            onChange={(value) => onParameterChange(param.name, value)}
                        />
                    ))}
                </FormSection>
            )}

            {/* Output Settings */}
            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={formatOperationName(operation.name)}
                    nodeType="action"
                    value={outputVariable}
                    onChange={onOutputVariableChange}
                />
            </FormSection>

            {/* New Connection Dialog */}
            {providerInfo && (
                <NewConnectionDialog
                    isOpen={isNewConnectionDialogOpen}
                    onClose={onCloseConnectionDialog}
                    provider={provider.providerId}
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
                    onSuccess={onConnectionCreated}
                    supportsOAuth={providerInfo.methods.includes("oauth2")}
                    supportsApiKey={providerInfo.methods.includes("api_key")}
                    oauthSettings={providerInfo.oauthSettings as never[]}
                />
            )}
        </>
    );
}

// Parameter Field Component
interface ParameterFieldProps {
    param: OperationParameter;
    value: unknown;
    onChange: (value: unknown) => void;
}

function ParameterField({ param, value, onChange }: ParameterFieldProps) {
    const labelWithRequired = param.required ? `${param.name} *` : param.name;

    if (param.type === "boolean") {
        return (
            <FormField label={labelWithRequired} description={param.description}>
                <Select
                    value={value ? "true" : "false"}
                    onChange={(val) => onChange(val === "true")}
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
            <FormField label={labelWithRequired} description={param.description}>
                <Input
                    type="number"
                    value={(value as number) || ""}
                    onChange={(e) => onChange(Number(e.target.value))}
                    placeholder={param.description || `Enter ${param.name}`}
                    className="font-mono"
                />
            </FormField>
        );
    }

    if (param.type === "object" || param.type === "array") {
        return (
            <FormField label={labelWithRequired} description={param.description || "JSON object"}>
                <Textarea
                    value={typeof value === "string" ? value : JSON.stringify(value || {}, null, 2)}
                    onChange={(e) => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            onChange(parsed);
                        } catch {
                            onChange(e.target.value);
                        }
                    }}
                    placeholder={"{ ... } or {{variableName}}"}
                    rows={6}
                    className="font-mono"
                />
            </FormField>
        );
    }

    // Default to text input
    return (
        <FormField label={labelWithRequired} description={param.description}>
            <Input
                type="text"
                value={(value as string) || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={param.description || `Enter ${param.name}`}
                className="font-mono"
            />
        </FormField>
    );
}
