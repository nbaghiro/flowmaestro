import { Cpu } from "lucide-react";
import { AgentBuilderConnectionSelector } from "../../agents/AgentBuilderConnectionSelector";
import { CollapsibleSection } from "./CollapsibleSection";

import type { Connection } from "../../../lib/api";

interface ModelSectionProps {
    connections: Connection[];
    selectedConnectionId: string;
    selectedModel: string;
    onConnectionChange: (
        connectionId: string,
        provider: string,
        model: string
    ) => void | Promise<void>;
}

export function ModelSection({
    connections,
    selectedConnectionId,
    selectedModel,
    onConnectionChange
}: ModelSectionProps) {
    // Generate summary text for collapsed state
    const selectedConnection = connections.find((c) => c.id === selectedConnectionId);
    const summaryText = selectedConnection
        ? `${selectedModel} via ${selectedConnection.name}`
        : "Select a model";

    return (
        <CollapsibleSection
            id="modelSection"
            title="AI Model"
            icon={Cpu}
            summaryContent={<span className="truncate">{summaryText}</span>}
        >
            <AgentBuilderConnectionSelector
                connections={connections}
                selectedConnectionId={selectedConnectionId}
                selectedModel={selectedModel}
                onConnectionChange={onConnectionChange}
            />
        </CollapsibleSection>
    );
}
