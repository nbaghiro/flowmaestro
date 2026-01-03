import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider,
    ALL_PROVIDERS,
    type ValidationError
} from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Slider } from "../../../components/common/Slider";
import { Textarea } from "../../../components/common/Textarea";
import { ProviderConnectionDialog } from "../../../components/connections/ProviderConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { useConnectionStore } from "../../../stores/connectionStore";

interface RouterNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

interface RouterRoute {
    value: string;
    label?: string;
    description?: string;
}

export function RouterNodeConfig({ data, onUpdate, errors: _errors = [] }: RouterNodeConfigProps) {
    const [provider, setProvider] = useState((data.provider as string) || "");
    const [model, setModel] = useState(
        (data.model as string) || getDefaultModelForProvider((data.provider as string) || "openai")
    );
    const [connectionId, setConnectionId] = useState<string>((data.connectionId as string) || "");
    const [systemPrompt, setSystemPrompt] = useState((data.systemPrompt as string) || "");
    const [prompt, setPrompt] = useState((data.prompt as string) || "");
    const [routes, setRoutes] = useState<RouterRoute[]>(
        (data.routes as RouterRoute[]) || [
            { value: "route_a", label: "Route A", description: "" },
            { value: "route_b", label: "Route B", description: "" }
        ]
    );
    const [defaultRoute, setDefaultRoute] = useState((data.defaultRoute as string) || "");
    const [temperature, setTemperature] = useState((data.temperature as number) ?? 0);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

    const { connections, fetchConnections } = useConnectionStore();

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);

    useEffect(() => {
        onUpdate({
            provider,
            model,
            connectionId,
            systemPrompt,
            prompt,
            routes,
            defaultRoute,
            temperature,
            outputVariable
        });
    }, [
        provider,
        model,
        connectionId,
        systemPrompt,
        prompt,
        routes,
        defaultRoute,
        temperature,
        outputVariable
    ]);

    const handleConnectionSelect = (selectedProvider: string, selectedConnectionId: string) => {
        setProvider(selectedProvider);
        setConnectionId(selectedConnectionId);
        setIsProviderDialogOpen(false);

        const defaultModel = getDefaultModelForProvider(selectedProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }
    };

    const addRoute = () => {
        const newIndex = routes.length + 1;
        setRoutes([
            ...routes,
            { value: `route_${newIndex}`, label: `Route ${newIndex}`, description: "" }
        ]);
    };

    const removeRoute = (index: number) => {
        if (routes.length > 2) {
            setRoutes(routes.filter((_, i) => i !== index));
        }
    };

    const updateRoute = (index: number, field: keyof RouterRoute, value: string) => {
        const updated = [...routes];
        updated[index] = { ...updated[index], [field]: value };
        setRoutes(updated);
    };

    return (
        <>
            <FormSection title="Model Configuration">
                <FormField label="LLM Provider Connection">
                    {provider && selectedConnection ? (
                        <button
                            type="button"
                            onClick={() => setIsProviderDialogOpen(true)}
                            className="w-full flex items-start gap-3 p-3 text-left border-2 border-border rounded-lg hover:border-primary/50 hover:bg-muted transition-all bg-card"
                        >
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

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm text-foreground">
                                        {providerInfo?.displayName || provider}
                                    </h3>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {selectedConnection.name}
                                </p>
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
                    <FormField label="Model">
                        <Select
                            value={model}
                            onChange={setModel}
                            options={
                                LLM_MODELS_BY_PROVIDER[
                                    provider as keyof typeof LLM_MODELS_BY_PROVIDER
                                ] || []
                            }
                        />
                    </FormField>
                )}
            </FormSection>

            <FormSection title="Classification Prompt">
                <FormField
                    label="System Prompt"
                    description="Optional instructions for the classifier"
                >
                    <Textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="You are a classification assistant..."
                        rows={2}
                    />
                </FormField>

                <FormField
                    label="Input to Classify"
                    description="Use {{variableName}} to reference data to classify"
                >
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Classify the following text: {{input}}"
                        rows={4}
                        className="font-mono"
                    />
                </FormField>

                <FormField label="Temperature" description="Use 0 for deterministic classification">
                    <Slider
                        value={temperature}
                        onChange={setTemperature}
                        min={0}
                        max={1}
                        step={0.1}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Routes">
                <p className="text-xs text-muted-foreground mb-3">
                    Define the possible classification outcomes. The LLM will choose one of these
                    routes.
                </p>

                {routes.map((route, index) => (
                    <div
                        key={index}
                        className="space-y-2 p-3 border border-border rounded-lg bg-muted/30 mb-3"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Route {index + 1}
                            </span>
                            {routes.length > 2 && (
                                <button
                                    onClick={() => removeRoute(index)}
                                    className="p-1 hover:bg-red-50 rounded transition-colors"
                                    title="Remove route"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                </button>
                            )}
                        </div>

                        <FormField label="Value (ID)">
                            <Input
                                type="text"
                                value={route.value}
                                onChange={(e) => updateRoute(index, "value", e.target.value)}
                                placeholder="route_id"
                                className="font-mono"
                            />
                        </FormField>

                        <FormField label="Label">
                            <Input
                                type="text"
                                value={route.label || ""}
                                onChange={(e) => updateRoute(index, "label", e.target.value)}
                                placeholder="Display label"
                            />
                        </FormField>

                        <FormField
                            label="Description"
                            description="Help the LLM understand this route"
                        >
                            <Textarea
                                value={route.description || ""}
                                onChange={(e) => updateRoute(index, "description", e.target.value)}
                                placeholder="When to use this route..."
                                rows={2}
                            />
                        </FormField>
                    </div>
                ))}

                <button
                    onClick={addRoute}
                    className="w-full px-3 py-2 text-sm border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Route
                </button>
            </FormSection>

            <FormSection title="Default Route">
                <FormField label="Fallback Route" description="Used if classification fails">
                    <Select
                        value={defaultRoute || "_none"}
                        onChange={(val) => setDefaultRoute(val === "_none" ? "" : val)}
                        options={[
                            { value: "_none", label: "None (first route)" },
                            ...routes.map((r) => ({
                                value: r.value,
                                label: r.label || r.value
                            }))
                        ]}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Router"}
                    nodeType="router"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>

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
