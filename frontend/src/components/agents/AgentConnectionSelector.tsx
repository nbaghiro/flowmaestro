/**
 * AgentConnectionSelector
 *
 * Wrapper around LLMConnectionDropdown for agent chat interface.
 * Supports override values that fall back to agent's default settings.
 */

import { LLMConnectionDropdown } from "../common/LLMConnectionDropdown";
import type { Agent } from "../../lib/api";

interface AgentConnectionSelectorProps {
    agent: Agent;
    overrideConnectionId?: string | null;
    overrideModel?: string | null;
    onOverrideChange: (connectionId: string, model: string) => void;
}

export function AgentConnectionSelector({
    agent,
    overrideConnectionId,
    overrideModel,
    onOverrideChange
}: AgentConnectionSelectorProps) {
    // Use override if provided, otherwise fall back to agent's settings
    const activeConnectionId = overrideConnectionId || agent.connection_id || "";
    const activeModel = overrideModel || agent.model;

    return (
        <LLMConnectionDropdown
            connectionId={activeConnectionId}
            model={activeModel}
            onSelect={(connId, model) => onOverrideChange(connId, model)}
            variant="compact"
            autoSelectFirst={false}
        />
    );
}
