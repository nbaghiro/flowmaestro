import { Settings } from "lucide-react";
import { useAgentBuilderLayoutStore } from "../../../stores/agentBuilderLayoutStore";
import { Tooltip } from "../../common/Tooltip";
import { Panel } from "./Panel";

interface ConfigPanelProps {
    children: React.ReactNode;
}

export function ConfigPanel({ children }: ConfigPanelProps) {
    const { togglePanel } = useAgentBuilderLayoutStore();

    // Collapsed content - compact icon bar
    const collapsedContent = (
        <div className="flex flex-col items-center pt-3 gap-1">
            <Tooltip content="Expand Configuration" position="right">
                <button
                    onClick={() => togglePanel("config")}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <Settings className="w-4 h-4" />
                </button>
            </Tooltip>
        </div>
    );

    return (
        <Panel
            id="config"
            collapsedContent={collapsedContent}
            collapsedWidth={48}
            minimizedIcon={Settings}
            minimizedLabel="Config"
        >
            <div className="h-full overflow-auto">
                <div className="p-6 space-y-6">{children}</div>
            </div>
        </Panel>
    );
}
