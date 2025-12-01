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

interface AudioNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const operations = [
    { value: "transcribe", label: "Transcribe Audio" },
    { value: "tts", label: "Text-to-Speech" }
];

const voices = [
    { value: "alloy", label: "Alloy" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "onyx", label: "Onyx" },
    { value: "nova", label: "Nova" },
    { value: "shimmer", label: "Shimmer" }
];

export function AudioNodeConfig({ data, onUpdate }: AudioNodeConfigProps) {
    const [operation, setOperation] = useState((data.operation as string) || "transcribe");
    const [provider, setProvider] = useState((data.provider as string) || "openai");
    const [model, setModel] = useState(
        (data.model as string) || getDefaultModelForProvider((data.provider as string) || "openai")
    );
    const [audioInput, setAudioInput] = useState((data.audioInput as string) || "");
    const [textInput, setTextInput] = useState((data.textInput as string) || "");
    const [voice, setVoice] = useState((data.voice as string) || "alloy");
    const [speed, setSpeed] = useState((data.speed as number) || 1.0);
    const [language, setLanguage] = useState((data.language as string) || "en");
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        onUpdate({
            operation,
            provider,
            model,
            audioInput,
            textInput,
            voice,
            speed,
            language,
            outputVariable
        });
    }, [operation, provider, model, audioInput, textInput, voice, speed, language, outputVariable]);

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

            {operation === "transcribe" && (
                <FormSection title="Transcription">
                    <FormField
                        label="Audio Source"
                        description="URL or use ${variableName} to reference node outputs"
                    >
                        <Input
                            type="text"
                            value={audioInput}
                            onChange={(e) => setAudioInput(e.target.value)}
                            placeholder="https://example.com/audio.mp3 or ${audioFile}"
                            className="font-mono"
                        />
                    </FormField>

                    <FormField
                        label="Language"
                        description="Source language (optional, auto-detected if not specified)"
                    >
                        <Input
                            type="text"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            placeholder="en, es, fr, de, etc."
                        />
                    </FormField>
                </FormSection>
            )}

            {operation === "tts" && (
                <FormSection title="Text-to-Speech">
                    <FormField label="Text Input" description="Text to convert to speech">
                        <Textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Enter text to convert to speech..."
                            rows={6}
                        />
                    </FormField>

                    <FormField label="Voice">
                        <Select value={voice} onChange={setVoice} options={voices} />
                    </FormField>

                    <FormField label="Speed" description="Speaking rate (0.25 = slow, 4.0 = fast)">
                        <Slider
                            value={speed}
                            onChange={setSpeed}
                            min={0.25}
                            max={4.0}
                            step={0.25}
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Audio"}
                    nodeType="audio"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
