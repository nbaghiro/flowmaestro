/**
 * ConnectionSelector for WorkflowChat
 *
 * Wrapper around LLMConnectionDropdown that connects to chatStore.
 */

import { useChatStore } from "../../stores/chatStore";
import { LLMConnectionDropdown } from "../common/LLMConnectionDropdown";

export function ConnectionSelector() {
    const { selectedConnectionId, selectedModel, setConnection } = useChatStore();

    return (
        <LLMConnectionDropdown
            connectionId={selectedConnectionId || ""}
            model={selectedModel || ""}
            onSelect={(connId, model) => setConnection(connId, model)}
            variant="compact"
            autoSelectFirst={true}
        />
    );
}
