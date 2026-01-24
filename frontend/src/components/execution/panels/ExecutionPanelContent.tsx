/**
 * Execution Panel Content Router
 * Routes between Triggers, Execution, and History tabs
 */

import { TriggerPanelContent } from "../../triggers/TriggerPanelContent";
import { ExecutionTab } from "./ExecutionTab";
import { HistoryTab } from "./HistoryTab";

interface ExecutionPanelContentProps {
    workflowId: string;
    activeTab: "triggers" | "execution" | "history";
}

export function ExecutionPanelContent({ workflowId, activeTab }: ExecutionPanelContentProps) {
    if (activeTab === "triggers") {
        return <TriggerPanelContent workflowId={workflowId} />;
    }

    if (activeTab === "execution") {
        return <ExecutionTab workflowId={workflowId} />;
    }

    if (activeTab === "history") {
        return <HistoryTab workflowId={workflowId} />;
    }

    return null;
}
