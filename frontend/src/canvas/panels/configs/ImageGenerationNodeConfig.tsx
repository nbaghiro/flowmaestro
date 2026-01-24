import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
import {
    IMAGE_GENERATION_PROVIDERS,
    getImageGenerationModelsForProvider,
    getDefaultImageGenerationModel,
    findImageGenerationModelByValue,
    getImageSizeOptionsForProvider,
    IMAGE_QUALITY_OPTIONS,
    IMAGE_STYLE_OPTIONS,
    IMAGE_ASPECT_RATIO_OPTIONS,
    IMAGE_OUTPUT_FORMAT_OPTIONS,
    ALL_PROVIDERS,
    getOperationsForProvider,
    UPSCALE_FACTOR_OPTIONS,
    type ImageEditingOperation,
    type ValidationError
} from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { ProviderConnectionDialog } from "../../../components/connections/dialogs/ProviderConnectionDialog";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { useConnectionStore } from "../../../stores/connectionStore";

interface ImageGenerationNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

export function ImageGenerationNodeConfig({
    data,
    onUpdate,
    errors = []
}: ImageGenerationNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Core state
    const [provider, setProvider] = useState<string>((data.provider as string) || "");
    const [model, setModel] = useState<string>((data.model as string) || "");
    const [connectionId, setConnectionId] = useState<string>((data.connectionId as string) || "");
    const [operation, setOperation] = useState<ImageEditingOperation>(
        (data.operation as ImageEditingOperation) || "generate"
    );

    // Editing operation fields
    const [sourceImage, setSourceImage] = useState<string>((data.sourceImage as string) || "");
    const [mask, setMask] = useState<string>((data.mask as string) || "");
    const [styleReference, setStyleReference] = useState<string>(
        (data.styleReference as string) || ""
    );
    const [scaleFactor, setScaleFactor] = useState<number>((data.scaleFactor as number) || 2);

    // Generation settings
    const [prompt, setPrompt] = useState<string>((data.prompt as string) || "");
    const [negativePrompt, setNegativePrompt] = useState<string>(
        (data.negativePrompt as string) || ""
    );
    const [size, setSize] = useState<string>((data.size as string) || "1024x1024");
    const [aspectRatio, setAspectRatio] = useState<string>((data.aspectRatio as string) || "1:1");
    const [quality, setQuality] = useState<string>((data.quality as string) || "standard");
    const [style, setStyle] = useState<string>((data.style as string) || "vivid");
    const [n, setN] = useState<number>((data.n as number) || 1);

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
    const modelInfo = findImageGenerationModelByValue(model);

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            provider,
            model,
            connectionId,
            operation,
            prompt,
            negativePrompt,
            sourceImage,
            mask,
            styleReference,
            scaleFactor,
            size,
            aspectRatio,
            quality,
            style,
            n,
            outputFormat,
            outputVariable
        });
    }, [
        provider,
        model,
        connectionId,
        operation,
        prompt,
        negativePrompt,
        sourceImage,
        mask,
        styleReference,
        scaleFactor,
        size,
        aspectRatio,
        quality,
        style,
        n,
        outputFormat,
        outputVariable
    ]);

    // Handle connection selection from dialog
    const handleConnectionSelect = (selectedProvider: string, selectedConnectionId: string) => {
        setProvider(selectedProvider);
        setConnectionId(selectedConnectionId);
        setIsProviderDialogOpen(false);

        // Set default model for new provider
        const defaultModel = getDefaultImageGenerationModel(selectedProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }
    };

    // Get available models based on provider
    const availableModels = provider ? getImageGenerationModelsForProvider(provider) : [];

    // Get size options for provider
    const sizeOptions = provider ? getImageSizeOptionsForProvider(provider) : [];

    // Provider-specific feature flags
    const isOpenAI = provider === "openai";
    const isStabilityAI = provider === "stabilityai";
    const isReplicate = provider === "replicate";
    const isFAL = provider === "fal";
    const showNegativePrompt = modelInfo?.supportsNegativePrompt ?? false;
    const showDallEOptions = isOpenAI && model === "dall-e-3";
    const showAspectRatio = isStabilityAI || isReplicate || isFAL;

    // Get available operations for the selected provider
    const availableOperations = provider ? getOperationsForProvider(provider) : [];

    // Operation-specific field visibility
    const isEditingOperation = operation !== "generate";
    const showSourceImage = isEditingOperation;
    const showMask = operation === "inpaint" || operation === "outpaint";
    const showStyleReference = operation === "styleTransfer";
    const showScaleFactor = operation === "upscale";

    // Compatible providers for image generation
    const compatibleProviders = IMAGE_GENERATION_PROVIDERS.map((p) => p.value);

    return (
        <>
            <FormSection title="Provider & Model">
                <FormField label="Image Provider Connection" error={getError("connectionId")}>
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

                {provider && availableOperations.length > 1 && (
                    <FormField
                        label="Operation"
                        description="Choose between generating new images or editing existing ones"
                    >
                        <Select
                            value={operation}
                            onChange={(val) => setOperation(val as ImageEditingOperation)}
                            options={availableOperations.map((op) => ({
                                value: op.value,
                                label: op.label
                            }))}
                        />
                    </FormField>
                )}
            </FormSection>

            {/* Source Image Section - for editing operations */}
            {showSourceImage && (
                <FormSection title="Source Image">
                    <FormField
                        label="Source Image"
                        description="URL or variable reference to the image to edit. Use {{variableName}} for dynamic values."
                        error={getError("sourceImage")}
                    >
                        <Input
                            value={sourceImage}
                            onChange={(e) => setSourceImage(e.target.value)}
                            placeholder="https://example.com/image.png or {{imageUrl}}"
                        />
                    </FormField>

                    {showMask && (
                        <FormField
                            label="Mask"
                            description="URL or variable reference to the mask image. White areas will be edited, black areas preserved."
                            error={getError("mask")}
                        >
                            <Input
                                value={mask}
                                onChange={(e) => setMask(e.target.value)}
                                placeholder="https://example.com/mask.png or {{maskUrl}}"
                            />
                        </FormField>
                    )}

                    {showStyleReference && (
                        <FormField
                            label="Style Reference"
                            description="URL or variable reference to the style reference image"
                            error={getError("styleReference")}
                        >
                            <Input
                                value={styleReference}
                                onChange={(e) => setStyleReference(e.target.value)}
                                placeholder="https://example.com/style.png or {{styleUrl}}"
                            />
                        </FormField>
                    )}

                    {showScaleFactor && (
                        <FormField label="Scale Factor" description="Upscale multiplier">
                            <Select
                                value={scaleFactor.toString()}
                                onChange={(val) => setScaleFactor(parseInt(val))}
                                options={UPSCALE_FACTOR_OPTIONS.map((opt) => ({
                                    value: opt.value.toString(),
                                    label: opt.label
                                }))}
                            />
                        </FormField>
                    )}
                </FormSection>
            )}

            <FormSection title={isEditingOperation ? "Edit Settings" : "Image Generation"}>
                <FormField
                    label="Prompt"
                    description="Describe the image you want to generate. Use {{variableName}} for dynamic values."
                    error={getError("prompt")}
                >
                    <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="A serene landscape with mountains and a lake at sunset..."
                        rows={6}
                    />
                </FormField>

                {showNegativePrompt && (
                    <FormField
                        label="Negative Prompt"
                        description="Describe what you don't want in the image (Stability AI only)"
                    >
                        <Textarea
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                            placeholder="blurry, low quality, distorted..."
                            rows={3}
                        />
                    </FormField>
                )}
            </FormSection>

            {provider && (
                <FormSection title="Image Settings">
                    {!showAspectRatio && sizeOptions.length > 0 && (
                        <FormField label="Image Size">
                            <Select value={size} onChange={setSize} options={sizeOptions} />
                        </FormField>
                    )}

                    {showAspectRatio && (
                        <FormField label="Aspect Ratio" description="Image proportions">
                            <Select
                                value={aspectRatio}
                                onChange={setAspectRatio}
                                options={IMAGE_ASPECT_RATIO_OPTIONS}
                            />
                        </FormField>
                    )}

                    {showDallEOptions && (
                        <>
                            <FormField
                                label="Quality"
                                description="HD produces higher quality images"
                            >
                                <Select
                                    value={quality}
                                    onChange={setQuality}
                                    options={IMAGE_QUALITY_OPTIONS}
                                />
                            </FormField>

                            <FormField
                                label="Style"
                                description="Vivid creates hyper-real images, Natural creates more realistic images"
                            >
                                <Select
                                    value={style}
                                    onChange={setStyle}
                                    options={IMAGE_STYLE_OPTIONS}
                                />
                            </FormField>
                        </>
                    )}

                    {isOpenAI && model !== "dall-e-3" && (
                        <FormField
                            label="Number of Images"
                            description="Generate multiple variations (DALL-E 2 only, 1-10)"
                        >
                            <Input
                                type="number"
                                value={n}
                                onChange={(e) =>
                                    setN(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                                }
                                min={1}
                                max={10}
                            />
                        </FormField>
                    )}
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <FormField
                    label="Output Format"
                    description="How the generated image(s) should be returned"
                >
                    <Select
                        value={outputFormat}
                        onChange={setOutputFormat}
                        options={IMAGE_OUTPUT_FORMAT_OPTIONS}
                    />
                </FormField>

                <OutputSettingsSection
                    nodeName={(data.label as string) || "Image"}
                    nodeType="imageGeneration"
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
