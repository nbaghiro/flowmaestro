/**
 * Audio Output Node Configuration Panel
 *
 * Configures TTS (Text-to-Speech) settings including provider, model,
 * voice, speed, and output format.
 */

import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Slider } from "../../../components/common/Slider";
import { Textarea } from "../../../components/common/Textarea";

interface AudioOutputNodeConfigProps {
    nodeId?: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const TTS_PROVIDERS = [
    { value: "openai", label: "OpenAI TTS" },
    { value: "elevenlabs", label: "ElevenLabs" },
    { value: "deepgram", label: "Deepgram Aura" }
];

const OPENAI_MODELS = [
    { value: "tts-1", label: "TTS-1 (Standard)" },
    { value: "tts-1-hd", label: "TTS-1-HD (High Quality)" }
];

const OPENAI_VOICES = [
    { value: "alloy", label: "Alloy" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "onyx", label: "Onyx" },
    { value: "nova", label: "Nova" },
    { value: "shimmer", label: "Shimmer" }
];

const ELEVENLABS_MODELS = [
    { value: "eleven_multilingual_v2", label: "Multilingual v2" },
    { value: "eleven_monolingual_v1", label: "Monolingual v1" },
    { value: "eleven_turbo_v2", label: "Turbo v2 (Fast)" }
];

const DEEPGRAM_MODELS = [
    { value: "aura-asteria-en", label: "Asteria (Female, English)" },
    { value: "aura-luna-en", label: "Luna (Female, English)" },
    { value: "aura-stella-en", label: "Stella (Female, English)" },
    { value: "aura-athena-en", label: "Athena (Female, English)" },
    { value: "aura-hera-en", label: "Hera (Female, English)" },
    { value: "aura-orion-en", label: "Orion (Male, English)" },
    { value: "aura-arcas-en", label: "Arcas (Male, English)" },
    { value: "aura-perseus-en", label: "Perseus (Male, English)" },
    { value: "aura-angus-en", label: "Angus (Male, English)" },
    { value: "aura-orpheus-en", label: "Orpheus (Male, English)" },
    { value: "aura-helios-en", label: "Helios (Male, English)" },
    { value: "aura-zeus-en", label: "Zeus (Male, English)" }
];

const OUTPUT_FORMATS = [
    { value: "mp3", label: "MP3" },
    { value: "wav", label: "WAV" },
    { value: "opus", label: "Opus" }
];

export function AudioOutputNodeConfig({
    nodeId: _nodeId,
    data,
    onUpdate,
    errors = []
}: AudioOutputNodeConfigProps) {
    const isInitialMount = useRef(true);
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // State
    const [provider, setProvider] = useState((data.provider as string) || "openai");
    const [model, setModel] = useState((data.model as string) || "tts-1");
    const [voice, setVoice] = useState((data.voice as string) || "alloy");
    const [textInput, setTextInput] = useState((data.textInput as string) || "");
    const [speed, setSpeed] = useState((data.speed as number) || 1.0);
    const [stability, setStability] = useState((data.stability as number) || 0.5);
    const [similarityBoost, setSimilarityBoost] = useState(
        (data.similarityBoost as number) || 0.75
    );
    const [outputFormat, setOutputFormat] = useState((data.outputFormat as string) || "mp3");
    const [outputVariable, setOutputVariable] = useState(
        (data.outputVariable as string) || "audioOutput"
    );
    const [returnAsUrl, setReturnAsUrl] = useState((data.returnAsUrl as boolean) || false);

    // Get models for selected provider
    const getModels = () => {
        switch (provider) {
            case "openai":
                return OPENAI_MODELS;
            case "elevenlabs":
                return ELEVENLABS_MODELS;
            case "deepgram":
                return DEEPGRAM_MODELS;
            default:
                return OPENAI_MODELS;
        }
    };

    // Handle provider change
    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set defaults for new provider
        switch (newProvider) {
            case "openai":
                setModel("tts-1");
                setVoice("alloy");
                break;
            case "elevenlabs":
                setModel("eleven_multilingual_v2");
                setVoice("");
                break;
            case "deepgram":
                setModel("aura-asteria-en");
                setVoice("");
                break;
        }
    };

    // Sync state to parent
    useEffect(() => {
        // Skip the initial mount - don't push unchanged data to store
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        onUpdate({
            provider,
            model,
            voice,
            textInput,
            speed,
            stability,
            similarityBoost,
            outputFormat,
            outputVariable,
            returnAsUrl
        });
    }, [
        provider,
        model,
        voice,
        textInput,
        speed,
        stability,
        similarityBoost,
        outputFormat,
        outputVariable,
        returnAsUrl
    ]);

    return (
        <>
            <FormSection title="TTS Provider">
                <FormField label="Provider" error={getError("provider")}>
                    <Select
                        value={provider}
                        onChange={handleProviderChange}
                        options={TTS_PROVIDERS}
                    />
                </FormField>

                <FormField
                    label={provider === "deepgram" ? "Voice Model" : "Model"}
                    error={getError("model")}
                >
                    <Select value={model} onChange={setModel} options={getModels()} />
                </FormField>

                {provider === "openai" && (
                    <FormField label="Voice">
                        <Select value={voice} onChange={setVoice} options={OPENAI_VOICES} />
                    </FormField>
                )}
            </FormSection>

            <FormSection title="Text Input">
                <FormField
                    label="Text to Synthesize"
                    description="Supports {{variableName}} interpolation"
                    error={getError("textInput")}
                >
                    <Textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Enter text to convert to speech...&#10;&#10;Use {{variable}} to reference workflow data."
                        rows={6}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Voice Settings" defaultExpanded={false}>
                {provider === "openai" && (
                    <FormField label="Speed" description="Speaking rate (0.25 = slow, 4.0 = fast)">
                        <Slider
                            value={speed}
                            onChange={setSpeed}
                            min={0.25}
                            max={4.0}
                            step={0.25}
                        />
                    </FormField>
                )}

                {provider === "elevenlabs" && (
                    <>
                        <FormField
                            label="Stability"
                            description="Lower = more expressive, higher = more consistent"
                        >
                            <Slider
                                value={stability}
                                onChange={setStability}
                                min={0}
                                max={1}
                                step={0.1}
                            />
                        </FormField>

                        <FormField
                            label="Similarity Boost"
                            description="How closely to match the original voice"
                        >
                            <Slider
                                value={similarityBoost}
                                onChange={setSimilarityBoost}
                                min={0}
                                max={1}
                                step={0.1}
                            />
                        </FormField>
                    </>
                )}

                {provider === "deepgram" && (
                    <p className="text-sm text-muted-foreground">
                        Deepgram Aura uses pre-configured voice models. Select a different voice
                        model above to change the voice characteristics.
                    </p>
                )}
            </FormSection>

            <FormSection title="Output Settings">
                <FormField label="Output Format">
                    <Select
                        value={outputFormat}
                        onChange={setOutputFormat}
                        options={OUTPUT_FORMATS}
                    />
                </FormField>

                <FormField
                    label="Return as URL"
                    description="Return a GCS URL instead of base64 data"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={returnAsUrl}
                            onChange={(e) => setReturnAsUrl(e.target.checked)}
                            className="rounded border-input"
                        />
                        <span className="text-sm">Return as URL (recommended for large files)</span>
                    </label>
                </FormField>

                <FormField
                    label="Output Variable"
                    description="Variable name to store the audio result"
                    error={getError("outputVariable")}
                >
                    <Input
                        type="text"
                        value={outputVariable}
                        onChange={(e) => setOutputVariable(e.target.value)}
                        placeholder="audioOutput"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>
        </>
    );
}
