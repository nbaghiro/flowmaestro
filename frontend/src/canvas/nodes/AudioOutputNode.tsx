/**
 * Audio Output Node Component
 *
 * A dedicated node for audio output (TTS - Text-to-Speech) at workflow end.
 * Only has an input handle (no outbound connections) since it's always a terminal node.
 */

import { Volume2 } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface AudioOutputNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    model?: string;
    voice?: string;
    textInput?: string;
}

function AudioOutputNode({ data, selected }: NodeProps<AudioOutputNodeData>) {
    const provider = data.provider || "openai";
    const model = data.model || "tts-1";
    const voice = data.voice || "alloy";
    const textInput = data.textInput || "No text configured";
    const textPreview = textInput.substring(0, 40) + (textInput.length > 40 ? "..." : "");

    // Format provider display name
    const getProviderDisplay = () => {
        switch (provider) {
            case "openai":
                return "OpenAI";
            case "elevenlabs":
                return "ElevenLabs";
            case "deepgram":
                return "Deepgram";
            default:
                return provider;
        }
    };

    // Format voice/model display
    const getVoiceDisplay = () => {
        // For ElevenLabs and Deepgram, the model IS the voice
        if (provider === "elevenlabs" || provider === "deepgram") {
            return model;
        }
        // For OpenAI, show the voice
        return voice;
    };

    return (
        <BaseNode
            icon={Volume2}
            label={data.label || "Audio Output"}
            status={data.status}
            category="outputs"
            selected={selected}
            hasOutputHandle={false}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium text-foreground">
                        {getProviderDisplay()}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Voice:</span>
                    <span className="text-xs font-medium text-foreground">{getVoiceDisplay()}</span>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-border">
                    <div className="text-xs text-muted-foreground italic line-clamp-2">
                        {textPreview}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(AudioOutputNode);
