import { MessageSquare } from "lucide-react";
import { useAgentBuilderLayoutStore } from "../../../stores/agentBuilderLayoutStore";
import { Tooltip } from "../../common/Tooltip";
import { Panel } from "./Panel";

interface ChatPanelProps {
    children: React.ReactNode;
    /** Optional unread message indicator */
    hasUnread?: boolean;
}

export function ChatPanel({ children, hasUnread = false }: ChatPanelProps) {
    const { togglePanel } = useAgentBuilderLayoutStore();

    // Collapsed content - compact chat icon
    const collapsedContent = (
        <div className="flex flex-col items-center pt-3 gap-1">
            <Tooltip content="Expand Chat" position="left">
                <button
                    onClick={() => togglePanel("chat")}
                    className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <MessageSquare className="w-4 h-4" />
                    {hasUnread && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                    )}
                </button>
            </Tooltip>
        </div>
    );

    return (
        <Panel
            id="chat"
            flexGrow
            resizable
            resizePosition="left"
            collapsedContent={collapsedContent}
            collapsedWidth={48}
            minimizedIcon={MessageSquare}
            minimizedLabel="Chat"
            hideSideBorders
        >
            <div className="h-full bg-background">{children}</div>
        </Panel>
    );
}
