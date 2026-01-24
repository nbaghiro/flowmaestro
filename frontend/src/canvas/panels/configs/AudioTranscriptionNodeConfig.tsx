/**
 * Audio Transcription Node Configuration Panel
 *
 * Configuration for transcribing audio using Whisper.
 */

import { useState, useEffect } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface AudioTranscriptionNodeConfigProps {
    nodeId: string;
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const MODEL_OPTIONS = [{ value: "whisper-1", label: "Whisper 1 (OpenAI)" }];

const TASK_OPTIONS = [
    { value: "transcribe", label: "Transcribe (Original Language)" },
    { value: "translate", label: "Translate to English" }
];

const OUTPUT_FORMAT_OPTIONS = [
    { value: "text", label: "Plain Text" },
    { value: "json", label: "JSON (with metadata)" },
    { value: "srt", label: "SRT (Subtitles)" },
    { value: "vtt", label: "VTT (Web Subtitles)" }
];

const LANGUAGE_OPTIONS = [
    { value: "", label: "Auto-detect" },
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "nl", label: "Dutch" },
    { value: "ru", label: "Russian" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
    { value: "pl", label: "Polish" },
    { value: "uk", label: "Ukrainian" }
];

export function AudioTranscriptionNodeConfig({
    data,
    onUpdate,
    errors = []
}: AudioTranscriptionNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // Audio source
    const [audioSource, setAudioSource] = useState<string>((data.audioSource as string) || "");

    // Model settings
    const [model, setModel] = useState<string>((data.model as string) || "whisper-1");
    const [task, setTask] = useState<string>((data.task as string) || "transcribe");
    const [language, setLanguage] = useState<string>((data.language as string) || "");

    // Output options
    const [outputFormat, setOutputFormat] = useState<string>(
        (data.outputFormat as string) || "text"
    );
    const [timestamps, setTimestamps] = useState<boolean>((data.timestamps as boolean) ?? false);

    // Advanced
    const [prompt, setPrompt] = useState<string>((data.prompt as string) || "");
    const [temperature, setTemperature] = useState<number>((data.temperature as number) ?? 0);

    // Output variable
    const [outputVariable, setOutputVariable] = useState<string>(
        (data.outputVariable as string) || ""
    );

    // Update parent on state change
    useEffect(() => {
        onUpdate({
            audioSource,
            model,
            task,
            language: language || undefined,
            outputFormat,
            timestamps,
            prompt: prompt || undefined,
            temperature,
            outputVariable
        });
    }, [
        audioSource,
        model,
        task,
        language,
        outputFormat,
        timestamps,
        prompt,
        temperature,
        outputVariable
    ]);

    return (
        <>
            <FormSection title="Audio Source">
                <FormField
                    label="Audio File"
                    description="Path or variable containing the audio file. Supports mp3, mp4, wav, webm, m4a."
                    error={getError("audioSource")}
                >
                    <Input
                        value={audioSource}
                        onChange={(e) => setAudioSource(e.target.value)}
                        placeholder="{{audioFilePath}} or /path/to/audio.mp3"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Model Settings">
                <FormField label="Model" error={getError("model")}>
                    <Select value={model} onChange={setModel} options={MODEL_OPTIONS} />
                </FormField>

                <FormField
                    label="Task"
                    description="Transcribe keeps original language, translate converts to English"
                >
                    <Select value={task} onChange={setTask} options={TASK_OPTIONS} />
                </FormField>

                <FormField
                    label="Language"
                    description="Specify language for better accuracy, or let Whisper auto-detect"
                >
                    <Select value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
                </FormField>
            </FormSection>

            <FormSection title="Output Options">
                <FormField label="Output Format">
                    <Select
                        value={outputFormat}
                        onChange={setOutputFormat}
                        options={OUTPUT_FORMAT_OPTIONS}
                    />
                </FormField>

                <label className="flex items-center gap-2 cursor-pointer">
                    <Input
                        type="checkbox"
                        checked={timestamps}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTimestamps(e.target.checked)
                        }
                        className="w-4 h-4"
                    />
                    <span className="text-sm">Include Word-Level Timestamps</span>
                </label>
            </FormSection>

            <FormSection title="Advanced" defaultExpanded={false}>
                <FormField
                    label="Prompt"
                    description="Optional text to guide transcription style or provide context (max 224 chars)"
                >
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value.slice(0, 224))}
                        placeholder="Technical terminology, speaker names, etc."
                        maxLength={224}
                    />
                </FormField>

                <FormField
                    label="Temperature"
                    description="0 = more deterministic, 1 = more creative. Default is 0."
                >
                    <div className="flex items-center gap-3">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-sm font-mono w-8">{temperature.toFixed(1)}</span>
                    </div>
                </FormField>
            </FormSection>

            <FormSection title="Output">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Transcription"}
                    nodeType="audioTranscription"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </>
    );
}
