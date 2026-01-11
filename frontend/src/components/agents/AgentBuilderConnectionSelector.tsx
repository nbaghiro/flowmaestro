/**
 * AgentBuilderConnectionSelector
 *
 * Wrapper around LLMConnectionDropdown for agent builder page.
 * Receives connections as props and uses full-width variant.
 */

import { LLMConnectionDropdown } from "../common/LLMConnectionDropdown";
import type { Connection } from "../../lib/api";

interface AgentBuilderConnectionSelectorProps {
    connections: Connection[];
    selectedConnectionId: string;
    selectedModel: string;
    onConnectionChange: (connectionId: string, provider: string, model: string) => void;
}

export function AgentBuilderConnectionSelector({
    connections,
    selectedConnectionId,
    selectedModel,
    onConnectionChange
}: AgentBuilderConnectionSelectorProps) {
    return (
        <LLMConnectionDropdown
            connectionId={selectedConnectionId}
            model={selectedModel}
            onSelect={(connId, model, provider) => onConnectionChange(connId, provider, model)}
            connections={connections}
            fetchOnMount={false}
            variant="full-width"
            label="AI Model Selection"
            placeholder="Select connection and model"
            align="left"
        />
    );
}
