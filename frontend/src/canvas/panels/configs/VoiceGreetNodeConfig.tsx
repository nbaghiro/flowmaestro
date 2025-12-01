import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/common/FormField";
import { Input } from "../../../components/common/Input";
import { Select } from "../../../components/common/Select";
import { Slider } from "../../../components/common/Slider";
import { Textarea } from "../../../components/common/Textarea";

interface VoiceGreetNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const voiceProviders = [
    { value: "elevenlabs", label: "ElevenLabs (High Quality)" },
    { value: "openai", label: "OpenAI TTS" }
];

const voicesByProvider: Record<string, Array<{ value: string; label: string }>> = {
    elevenlabs: [
        { value: "rachel", label: "Rachel (Natural)" },
        { value: "domi", label: "Domi (Strong)" },
        { value: "bella", label: "Bella (Soft)" },
        { value: "antoni", label: "Antoni (Well-rounded)" },
        { value: "elli", label: "Elli (Emotional)" }
    ],
    openai: [
        { value: "alloy", label: "Alloy" },
        { value: "echo", label: "Echo" },
        { value: "fable", label: "Fable" },
        { value: "onyx", label: "Onyx" },
        { value: "nova", label: "Nova" },
        { value: "shimmer", label: "Shimmer" }
    ]
};

export function VoiceGreetNodeConfig({ data, onUpdate }: VoiceGreetNodeConfigProps) {
    const [message, setMessage] = useState(
        (data.message as string) || "Hello! How can I help you today?"
    );
    const [voiceProvider, setVoiceProvider] = useState(
        (data.voiceProvider as string) || "elevenlabs"
    );
    const [voice, setVoice] = useState((data.voice as string) || "rachel");
    const [speed, setSpeed] = useState((data.speed as number) || 1.0);
    const [interruptible, setInterruptible] = useState((data.interruptible as boolean) !== false);

    useEffect(() => {
        onUpdate({
            message,
            voiceProvider,
            voice,
            speed,
            interruptible
        });
    }, [message, voiceProvider, voice, speed, interruptible, onUpdate]);

    const handleProviderChange = (newProvider: string) => {
        setVoiceProvider(newProvider);
        // Set default voice for new provider
        const voices = voicesByProvider[newProvider as keyof typeof voicesByProvider];
        if (voices && voices.length > 0) {
            setVoice(voices[0].value);
        }
    };

    return (
        <div>
            <FormSection title="Message">
                <FormField label="Text to speak">
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px]"
                        placeholder="Hello! How can I help you today?"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Use variables like {"{"}user.name{"}"} to personalize the message
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Voice Settings">
                <FormField label="Voice Provider">
                    <Select
                        value={voiceProvider}
                        onChange={handleProviderChange}
                        options={voiceProviders}
                    />
                </FormField>

                <FormField label="Voice">
                    <Select
                        value={voice}
                        onChange={setVoice}
                        options={
                            voicesByProvider[voiceProvider as keyof typeof voicesByProvider] || []
                        }
                    />
                </FormField>

                <FormField label="Speed">
                    <Slider value={speed} onChange={setSpeed} min={0.25} max={4.0} step={0.25} />
                    <p className="text-xs text-muted-foreground mt-1">
                        Adjust speech speed (0.25 = very slow, 1.0 = normal, 4.0 = very fast)
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Behavior">
                <FormField label="">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Input
                            type="checkbox"
                            checked={interruptible}
                            onChange={(e) => setInterruptible(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Allow caller to interrupt (barge-in)</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                        If enabled, caller can speak during playback to interrupt
                    </p>
                </FormField>
            </FormSection>
        </div>
    );
}
