import { Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
    getDefaultModelForProvider,
    getTemperatureMaxForProvider,
    ALL_PROVIDERS,
    type ValidationError
} from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { LLMModelSelect } from "../../../components/common/LLMModelSelect";
import { Slider } from "../../../components/common/Slider";
import { VariableInput } from "../../../components/common/VariableInput";
import { ProviderConnectionDialog } from "../../../components/connections/dialogs/ProviderConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { useConnectionStore } from "../../../stores/connectionStore";

interface LLMNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

export function LLMNodeConfig({ nodeId, data, onUpdate, errors = [] }: LLMNodeConfigProps) {
    const isInitialMount = useRef(true);
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;
    const [provider, setProvider] = useState((data.provider as string) || "");
    const [model, setModel] = useState(
        (data.model as string) || getDefaultModelForProvider((data.provider as string) || "openai")
    );
    const [connectionId, setConnectionId] = useState<string>((data.connectionId as string) || "");
    const [systemPrompt, setSystemPrompt] = useState((data.systemPrompt as string) || "");
    const [prompt, setPrompt] = useState((data.prompt as string) || "");
    const [temperature, setTemperature] = useState((data.temperature as number) || 0.7);
    const [maxTokens, setMaxTokens] = useState((data.maxTokens as number) || 1000);
    const [topP, setTopP] = useState((data.topP as number) || 1);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections on mount
    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Get selected connection and provider info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    // Auto-select connection when provider is set but connectionId is missing
    useEffect(() => {
        if (provider && !connectionId && connections.length > 0) {
            // Find an active connection for this provider
            const matchingConnection = connections.find(
                (conn) => conn.provider === provider && conn.status === "active"
            );
            if (matchingConnection) {
                setConnectionId(matchingConnection.id);
            }
        }
    }, [provider, connectionId, connections]);

    // Clamp temperature when provider changes (if it exceeds the new max)
    // Note: intentionally only depends on provider, not temperature, to avoid re-clamping on every temp change
    useEffect(() => {
        if (provider) {
            const maxTemp = getTemperatureMaxForProvider(provider);
            // Use functional update to get current temperature value
            setTemperature((currentTemp) => (currentTemp > maxTemp ? maxTemp : currentTemp));
        }
    }, [provider]);

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            provider,
            model,
            connectionId,
            systemPrompt,
            prompt,
            temperature,
            maxTokens,
            topP,
            outputVariable
        });
    }, [
        provider,
        model,
        connectionId,
        systemPrompt,
        prompt,
        temperature,
        maxTokens,
        topP,
        outputVariable
    ]);

    // Handle connection selection from dialog
    const handleConnectionSelect = (selectedProvider: string, selectedConnectionId: string) => {
        setProvider(selectedProvider);
        setConnectionId(selectedConnectionId);
        setIsProviderDialogOpen(false);

        // Set default model for new provider
        const defaultModel = getDefaultModelForProvider(selectedProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }

        // Clamp temperature if it exceeds the new provider's max
        const maxTemp = getTemperatureMaxForProvider(selectedProvider);
        if (temperature > maxTemp) {
            setTemperature(maxTemp);
        }
    };

    // Calculate max temperature based on provider
    const maxTemperature = provider ? getTemperatureMaxForProvider(provider) : 2.0;

    return (
        <>
            <FormSection title="Model Configuration">
                <FormField label="LLM Provider Connection" error={getError("connectionId")}>
                    {provider && selectedConnection ? (
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-start gap-3 p-3 text-left border-2 border-border rounded-lg hover:border-primary/50 hover:bg-muted transition-all bg-card"
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
                                    <p className="text-xs text-muted-foreground/70 truncate">
                                        {selectedConnection.metadata.account_info.email}
                                    </p>
                                )}
                            </div>
                        </button>
                    ) : (
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

                {provider && (
                    <FormField label="Model" error={getError("model")}>
                        <LLMModelSelect
                            provider={provider}
                            value={model}
                            onChange={setModel}
                            error={getError("model")}
                        />
                    </FormField>
                )}
            </FormSection>

            <FormSection title="Prompts">
                <FormField
                    label="System Prompt"
                    description="Instructions for the AI model's behavior"
                >
                    <VariableInput
                        nodeId={nodeId}
                        value={systemPrompt}
                        onChange={setSystemPrompt}
                        placeholder="You are a helpful assistant..."
                        multiline
                        rows={4}
                    />
                </FormField>

                <FormField
                    label="User Prompt"
                    description="Type {{ to autocomplete variables, or use the picker"
                    error={getError("prompt")}
                >
                    <VariableInput
                        nodeId={nodeId}
                        value={prompt}
                        onChange={setPrompt}
                        placeholder="Enter your prompt here..."
                        multiline
                        rows={6}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Parameters">
                <FormField
                    label="Temperature"
                    description={`Controls randomness (0 = deterministic, ${maxTemperature} = creative)`}
                >
                    <Slider
                        value={temperature}
                        onChange={setTemperature}
                        min={0}
                        max={maxTemperature}
                        step={0.1}
                    />
                </FormField>

                <FormField label="Max Tokens" description="Maximum length of the response">
                    <Input
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                        min={1}
                        max={32000}
                    />
                </FormField>

                <FormField label="Top P" description="Nucleus sampling threshold">
                    <Slider value={topP} onChange={setTopP} min={0} max={1} step={0.05} />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "LLM"}
                    nodeType="llm"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

            {/* Provider Connection Dialog */}
            <ProviderConnectionDialog
                isOpen={isProviderDialogOpen}
                onClose={() => setIsProviderDialogOpen(false)}
                selectedConnectionId={connectionId}
                defaultCategory="AI & ML"
                onSelect={handleConnectionSelect}
            />
        </>
    );
}
