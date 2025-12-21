import { useState, useEffect } from "react";
import {
    LLM_PROVIDERS,
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider
} from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Slider } from "../../../components/common/Slider";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface VisionNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operations = [
    { value: "analyze", label: "Analyze Image" },
    { value: "generate", label: "Generate Image" }
];

export function VisionNodeConfig({ data, onUpdate }: VisionNodeConfigProps) {
    const [operation, setOperation] = useState((data.operation as string) || "analyze");
    const [provider, setProvider] = useState((data.provider as string) || "openai");
    const [model, setModel] = useState(
        (data.model as string) || getDefaultModelForProvider((data.provider as string) || "openai")
    );
    const [prompt, setPrompt] = useState((data.prompt as string) || "");
    const [imageInput, setImageInput] = useState((data.imageInput as string) || "");
    const [temperature, setTemperature] = useState((data.temperature as number) || 0.7);
    const [maxTokens, setMaxTokens] = useState((data.maxTokens as number) || 1000);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            operation,
            provider,
            model,
            prompt,
            imageInput,
            temperature,
            maxTokens,
            outputVariable
        });
    }, [operation, provider, model, prompt, imageInput, temperature, maxTokens, outputVariable]);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set default model for new provider
        const defaultModel = getDefaultModelForProvider(newProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }
    };

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Type">
                    <Select value={operation} onChange={setOperation} options={operations} />
                </FormField>
            </FormSection>

            <FormSection title="Model Configuration">
                <FormField label="Provider">
                    <Select
                        value={provider}
                        onChange={handleProviderChange}
                        options={LLM_PROVIDERS}
                    />
                </FormField>

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
            </FormSection>

            {operation === "analyze" && (
                <FormSection title="Input">
                    <FormField
                        label="Image Source"
                        description="URL or use {{variableName}} to reference node outputs"
                    >
                        <Input
                            type="text"
                            value={imageInput}
                            onChange={(e) => setImageInput(e.target.value)}
                            placeholder="https://example.com/image.jpg or {{imageUrl}}"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField
                        label="Analysis Prompt"
                        description="What would you like to know about the image?"
                    >
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe what you see in this image..."
                            rows={6}
                        />
                    </FormField>
                </FormSection>
            )}

            {operation === "generate" && (
                <FormSection title="Generation">
                    <FormField
                        label="Image Description"
                        description="Describe the image you want to generate"
                    >
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="A serene landscape with mountains and a lake..."
                            rows={6}
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Parameters">
                <FormField
                    label="Temperature"
                    description="Controls randomness (0 = deterministic, 2 = creative)"
                >
                    <Slider
                        value={temperature}
                        onChange={setTemperature}
                        min={0}
                        max={2}
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
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Vision"}
                    nodeType="vision"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
