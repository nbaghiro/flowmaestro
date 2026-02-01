/**
 * Audio Input Node Component
 *
 * A dedicated node for audio input (STT - Speech-to-Text) at workflow start.
 * Only has an output handle (no inbound connections) since it's always a start node.
 */

import { Mic } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface AudioInputNodeData {
    label: string;
    status?: NodeExecutionStatus;
    provider?: string;
    model?: string;
}

function AudioInputNode({ data, selected }: NodeProps<AudioInputNodeData>) {
    const provider = data.provider || "openai";
    const model = data.model || "whisper-1";

    // Format provider display name
    const getProviderDisplay = () => {
        switch (provider) {
            case "openai":
                return "OpenAI";
            case "deepgram":
                return "Deepgram";
            default:
                return provider;
        }
    };

    return (
        <BaseNode
            icon={Mic}
            label={data.label || "Audio Input"}
            status={data.status}
            category="inputs"
            selected={selected}
            hasInputHandle={false}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Provider:</span>
                    <span className="text-xs font-medium text-foreground">
                        {getProviderDisplay()}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium text-foreground">{model}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(AudioInputNode);
