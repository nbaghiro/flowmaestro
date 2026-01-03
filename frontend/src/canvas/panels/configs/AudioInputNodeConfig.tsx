/**
 * Audio Input Node Configuration Panel
 *
 * Configures STT (Speech-to-Text) settings including provider, model,
 * language, and test recording functionality.
 */

import { Mic, Square, Upload } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ValidationError } from "@flowmaestro/shared";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";

interface AudioInputNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
    errors?: ValidationError[];
}

const STT_PROVIDERS = [
    { value: "openai", label: "OpenAI Whisper" },
    { value: "deepgram", label: "Deepgram" }
];

const OPENAI_MODELS = [{ value: "whisper-1", label: "Whisper v1" }];

const DEEPGRAM_MODELS = [
    { value: "nova-2", label: "Nova-2 (Best)" },
    { value: "nova", label: "Nova" },
    { value: "enhanced", label: "Enhanced" },
    { value: "base", label: "Base" }
];

const LANGUAGES = [
    { value: "auto", label: "Auto-detect" },
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ja", label: "Japanese" },
    { value: "zh", label: "Chinese" },
    { value: "ko", label: "Korean" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
    { value: "ru", label: "Russian" }
];

export function AudioInputNodeConfig({ data, onUpdate, errors = [] }: AudioInputNodeConfigProps) {
    const getError = (field: string) => errors.find((e) => e.field === field)?.message;

    // State
    const [provider, setProvider] = useState((data.provider as string) || "openai");
    const [model, setModel] = useState((data.model as string) || "whisper-1");
    const [language, setLanguage] = useState((data.language as string) || "auto");
    const [outputVariable, setOutputVariable] = useState(
        (data.outputVariable as string) || "transcription"
    );
    const [inputName, setInputName] = useState((data.inputName as string) || "audio");

    // Deepgram-specific options
    const [punctuate, setPunctuate] = useState((data.punctuate as boolean) ?? true);
    const [diarize, setDiarize] = useState((data.diarize as boolean) ?? false);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState<string | null>(null);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordingError, setRecordingError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Get models for selected provider
    const getModels = () => {
        if (provider === "openai") return OPENAI_MODELS;
        return DEEPGRAM_MODELS;
    };

    // Handle provider change
    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set default model for new provider
        if (newProvider === "openai") {
            setModel("whisper-1");
        } else {
            setModel("nova-2");
        }
    };

    // Recording functions
    const startRecording = async () => {
        setRecordingError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            setRecordingDuration(0);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setAudioURL(URL.createObjectURL(blob));
                stream.getTracks().forEach((track) => track.stop());
                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);

            // Track duration
            durationIntervalRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            setRecordingError(err instanceof Error ? err.message : "Failed to start recording");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // File upload handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Revoke previous URL if exists
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
            }
            setAudioURL(URL.createObjectURL(file));
            setAudioFileName(file.name);
        }
    };

    // Format duration as mm:ss
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
            }
        };
    }, [audioURL]);

    // Sync state to parent
    useEffect(() => {
        onUpdate({
            provider,
            model,
            language,
            outputVariable,
            inputName,
            punctuate,
            diarize
        });
    }, [provider, model, language, outputVariable, inputName, punctuate, diarize]);

    return (
        <>
            <FormSection title="STT Provider">
                <FormField label="Provider" error={getError("provider")}>
                    <Select
                        value={provider}
                        onChange={handleProviderChange}
                        options={STT_PROVIDERS}
                    />
                </FormField>

                <FormField label="Model" error={getError("model")}>
                    <Select value={model} onChange={setModel} options={getModels()} />
                </FormField>
            </FormSection>

            <FormSection title="Audio Source">
                <FormField
                    label="Input Parameter Name"
                    description="Name of the audio input when triggering the workflow"
                    error={getError("inputName")}
                >
                    <Input
                        type="text"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        placeholder="audio"
                        className="font-mono"
                    />
                </FormField>

                {/* Test Recording Section */}
                <div className="mt-4 p-3 border border-dashed border-border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-3">Test Recording</p>
                    <div className="flex items-center gap-2">
                        {!isRecording ? (
                            <button
                                type="button"
                                onClick={startRecording}
                                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                            >
                                <Mic className="w-4 h-4" />
                                Record Audio
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm hover:bg-destructive/90 transition-colors"
                            >
                                <Square className="w-4 h-4" />
                                Stop ({formatDuration(recordingDuration)})
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Upload className="w-3 h-3" />
                            Upload file
                        </button>
                    </div>
                    {recordingError && (
                        <p className="mt-2 text-sm text-destructive">{recordingError}</p>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {audioURL && (
                        <div className="mt-3">
                            {audioFileName && (
                                <p className="text-xs text-muted-foreground mb-2 truncate">
                                    {audioFileName}
                                </p>
                            )}
                            <audio controls src={audioURL} className="w-full h-10" />
                        </div>
                    )}
                </div>
            </FormSection>

            <FormSection title="Transcription Settings" defaultExpanded={false}>
                <FormField
                    label="Language"
                    description="Optional: specify source language for better accuracy"
                >
                    <Select value={language} onChange={setLanguage} options={LANGUAGES} />
                </FormField>

                {provider === "deepgram" && (
                    <>
                        <FormField
                            label="Punctuation"
                            description="Automatically add punctuation to transcription"
                        >
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={punctuate}
                                    onChange={(e) => setPunctuate(e.target.checked)}
                                    className="rounded border-input"
                                />
                                <span className="text-sm">Enable punctuation</span>
                            </label>
                        </FormField>

                        <FormField
                            label="Speaker Diarization"
                            description="Identify and label different speakers"
                        >
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={diarize}
                                    onChange={(e) => setDiarize(e.target.checked)}
                                    className="rounded border-input"
                                />
                                <span className="text-sm">Enable diarization</span>
                            </label>
                        </FormField>
                    </>
                )}
            </FormSection>

            <FormSection title="Output">
                <FormField
                    label="Output Variable"
                    description="Variable name to store transcription result"
                    error={getError("outputVariable")}
                >
                    <Input
                        type="text"
                        value={outputVariable}
                        onChange={(e) => setOutputVariable(e.target.value)}
                        placeholder="transcription"
                        className="font-mono"
                    />
                </FormField>
            </FormSection>
        </>
    );
}
