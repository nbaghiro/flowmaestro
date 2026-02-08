import { Settings, X } from "lucide-react";
import { useAgentBuilderLayoutStore } from "../../../stores/agentBuilderLayoutStore";
import { Tooltip } from "../../common/Tooltip";
import { Panel } from "./Panel";

interface ConfigPanelProps {
    children: React.ReactNode;
    error?: string | null;
    onDismissError?: () => void;
}

export function ConfigPanel({ children, error, onDismissError }: ConfigPanelProps) {
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
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between gap-2">
                        <p className="text-sm text-destructive">{error}</p>
                        {onDismissError && (
                            <button
                                onClick={onDismissError}
                                className="p-1 hover:bg-destructive/20 rounded transition-colors flex-shrink-0"
                            >
                                <X className="w-4 h-4 text-destructive" />
                            </button>
                        )}
                    </div>
                )}
                <div className="pt-2 px-6 pb-6 space-y-6">{children}</div>
            </div>
        </Panel>
    );
}
