import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import {
    VIDEO_GENERATION_PROVIDERS,
    getVideoGenerationModelsForProvider,
    getDefaultVideoGenerationModel,
    findVideoGenerationModelByValue,
    modelSupportsImageInput,
    VIDEO_ASPECT_RATIO_OPTIONS,
    getVideoDurationOptionsForProvider,
    VIDEO_OUTPUT_FORMAT_OPTIONS,
    ALL_PROVIDERS,
    type ValidationError
} from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { ProviderConnectionDialog } from "../../../components/connections/dialogs/ProviderConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { useConnectionStore } from "../../../stores/connectionStore";

interface VideoGenerationNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

export function VideoGenerationNodeConfig({
    data,
    onUpdate,
    errors = []
}: VideoGenerationNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Core state
    const [provider, setProvider] = useState<string>((data.provider as string) || "");
    const [model, setModel] = useState<string>((data.model as string) || "");
    const [connectionId, setConnectionId] = useState<string>((data.connectionId as string) || "");

    // Generation settings
    const [prompt, setPrompt] = useState<string>((data.prompt as string) || "");
    const [imageInput, setImageInput] = useState<string>((data.imageInput as string) || "");
    const [duration, setDuration] = useState<number>((data.duration as number) || 5);
    const [aspectRatio, setAspectRatio] = useState<string>((data.aspectRatio as string) || "16:9");
    const [loop, setLoop] = useState<boolean>((data.loop as boolean) || false);

    // Output settings
    const [outputFormat, setOutputFormat] = useState<string>(
        (data.outputFormat as string) || "url"
    );
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // UI state
    const [isProviderDialogOpen, setIsProviderDialogOpen] = useState(false);

    const { connections, fetchConnections } = useConnectionStore();

    // Fetch connections on mount
    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    // Get selected connection and provider info
    const selectedConnection = connections.find((conn) => conn.id === connectionId);
    const providerInfo = ALL_PROVIDERS.find((p) => p.provider === provider);
    const modelInfo = findVideoGenerationModelByValue(model);

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            provider,
            model,
            connectionId,
            prompt,
            imageInput,
            duration,
            aspectRatio,
            loop,
            outputFormat,
            outputVariable
        });
    }, [
        provider,
        model,
        connectionId,
        prompt,
        imageInput,
        duration,
        aspectRatio,
        loop,
        outputFormat,
        outputVariable
    ]);

    // Handle connection selection from dialog
    const handleConnectionSelect = (selectedProvider: string, selectedConnectionId: string) => {
        setProvider(selectedProvider);
        setConnectionId(selectedConnectionId);
        setIsProviderDialogOpen(false);

        // Set default model for new provider
        const defaultModel = getDefaultVideoGenerationModel(selectedProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }
    };

    // Get available models based on provider
    const availableModels = provider ? getVideoGenerationModelsForProvider(provider) : [];

    // Get duration options for provider
    const durationOptions = provider ? getVideoDurationOptionsForProvider(provider) : [];

    // Provider-specific feature flags
    const isStabilityAI = provider === "stabilityai";
    const showImageInput = modelSupportsImageInput(model);
    const requiresImageInput = isStabilityAI; // Stability AI video requires image input
    const showLoopOption = provider === "luma";

    // Compatible providers for video generation
    const compatibleProviders = VIDEO_GENERATION_PROVIDERS.map((p) => p.value);

    return (
        <>
            <FormSection title="Provider & Model">
                <FormField label="Video Provider Connection" error={getError("connectionId")}>
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

                {provider && availableModels.length > 0 && (
                    <FormField label="Model" error={getError("model")}>
                        <Select
                            value={model}
                            onChange={setModel}
                            options={availableModels.map((m) => ({
                                value: m.value,
                                label: m.label
                            }))}
                        />
                    </FormField>
                )}

                {modelInfo && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 space-y-1">
                        <div>Max Duration: {modelInfo.maxDuration || 10}s</div>
                        {modelInfo.maxResolution && (
                            <div>Max Resolution: {modelInfo.maxResolution}</div>
                        )}
                        {modelInfo.supportsImageInput && <div>Supports Image-to-Video</div>}
                        {modelInfo.supportsAudio && <div>Supports Audio Generation</div>}
                    </div>
                )}
            </FormSection>

            <FormSection title="Video Generation">
                <FormField
                    label="Prompt"
                    description="Describe the video you want to generate. Use {{variableName}} for dynamic values."
                    error={getError("prompt")}
                >
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="A drone shot flying over a mountain range at sunrise..."
                        rows={6}
                    />
                </FormField>

                {showImageInput && (
                    <FormField
                        label={
                            requiresImageInput ? "Image Input (Required)" : "Image Input (Optional)"
                        }
                        description="URL or variable for image-to-video generation"
                        error={getError("imageInput")}
                    >
                        <Input
                            type="text"
                            value={imageInput}
                            onChange={(e) => setImageInput(e.target.value)}
                            placeholder="https://example.com/image.jpg or {{imageUrl}}"
                            className="font-mono"
                        />
                    </FormField>
                )}
            </FormSection>

            {provider && (
                <FormSection title="Video Settings">
                    {durationOptions.length > 0 && (
                        <FormField label="Duration" description="Length of the generated video">
                            <Select
                                value={duration.toString()}
                                onChange={(val) => setDuration(parseInt(val))}
                                options={durationOptions.map((opt) => ({
                                    value: opt.value.toString(),
                                    label: opt.label
                                }))}
                            />
                        </FormField>
                    )}

                    {!isStabilityAI && (
                        <FormField label="Aspect Ratio" description="Video proportions">
                            <Select
                                value={aspectRatio}
                                onChange={setAspectRatio}
                                options={VIDEO_ASPECT_RATIO_OPTIONS}
                            />
                        </FormField>
                    )}

                    {showLoopOption && (
                        <FormField label="Loop">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={loop}
                                    onChange={(e) => setLoop(e.target.checked)}
                                    className="rounded border-border"
                                />
                                <span className="text-sm text-muted-foreground">
                                    Create a seamlessly looping video
                                </span>
                            </label>
                        </FormField>
                    )}
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <FormField
                    label="Output Format"
                    description="How the generated video should be returned"
                >
                    <Select
                        value={outputFormat}
                        onChange={setOutputFormat}
                        options={VIDEO_OUTPUT_FORMAT_OPTIONS}
                    />
                </FormField>

                <OutputSettingsSection
                    nodeName={(data.label as string) || "Video"}
                    nodeType="videoGeneration"
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
                includeProviders={compatibleProviders}
                onSelect={handleConnectionSelect}
            />
        </>
    );
}
