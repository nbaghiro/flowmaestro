/**
 * Audio Transcription Node Component
 *
 * Transcribes audio to text using Whisper.
 * Uses the audio_transcribe builtin tool.
 */

import { AudioLines } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface AudioTranscriptionNodeData {
    label: string;
    status?: NodeExecutionStatus;
    model?: string;
    language?: string;
    task?: "transcribe" | "translate";
    outputFormat?: string;
}

function AudioTranscriptionNode({ data, selected }: NodeProps<AudioTranscriptionNodeData>) {
    const model = data.model || "whisper-1";
    const task = data.task || "transcribe";
    const language = data.language || "auto";

    return (
        <BaseNode
            icon={AudioLines}
            label={data.label || "Transcribe"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium text-foreground">{model}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Task:</span>
                    <span className="text-xs font-medium text-foreground capitalize">{task}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Language:</span>
                    <span className="text-xs font-medium text-foreground uppercase">
                        {language === "auto" ? "Auto" : language}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(AudioTranscriptionNode);
