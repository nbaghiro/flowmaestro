import { useState, useEffect, useRef } from "react";
import {
    LLM_PROVIDERS,
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider,
    type ValidationError
} from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Textarea } from "../../../components/common/Textarea";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface EmbeddingsNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const dimensionsByModel: Record<string, number> = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
    "embed-english-v3.0": 1024,
    "embed-multilingual-v3.0": 1024,
    "textembedding-gecko": 768,
    "textembedding-gecko-multilingual": 768,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
    "sentence-transformers/all-mpnet-base-v2": 768
};

export function EmbeddingsNodeConfig({
    data,
    onUpdate,
    errors: _errors = []
}: EmbeddingsNodeConfigProps) {
    const isInitialMount = useRef(true);
    const [provider, setProvider] = useState((data.provider as string) || "openai");
    const [model, setModel] = useState(
        (data.model as string) || getDefaultModelForProvider((data.provider as string) || "openai")
    );
    const [input, setInput] = useState((data.input as string) || "");
    const [batchMode, setBatchMode] = useState((data.batchMode as boolean) || false);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    const dimensions = dimensionsByModel[model as keyof typeof dimensionsByModel] || 1536;

    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            provider,
            model,
            input,
            batchMode,
            dimensions,
            outputVariable
        });
    }, [provider, model, input, batchMode, dimensions, outputVariable]);

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

                <FormField
                    label="Embedding Dimensions"
                    description="Vector dimensions for this model"
                >
                    <Input
                        type="text"
                        value={dimensions}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Input">
                <FormField
                    label="Batch Mode"
                    description="Process multiple texts at once (one per line)"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={batchMode}
                            onChange={(e) => setBatchMode(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Enable batch processing</span>
                    </label>
                </FormField>

                <FormField
                    label={batchMode ? "Text Inputs (one per line)" : "Text Input"}
                    description="Use {{variableName}} to reference other node outputs"
                >
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            batchMode
                                ? "First text to embed\nSecond text to embed\nThird text to embed"
                                : "Enter text to generate embeddings..."
                        }
                        rows={batchMode ? 8 : 6}
                        className="font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Embeddings"}
                    nodeType="embeddings"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
