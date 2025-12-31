import { Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { useChatStore } from "../stores/chatStore";

export function AIAskButton() {
    const { isPanelOpen, togglePanel } = useChatStore();

    return (
        <button
            onClick={togglePanel}
            className={cn(
                "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                isPanelOpen
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                    : "bg-card border-border hover:bg-muted"
            )}
            title="AI Workflow Assistant (Cmd+K)"
        >
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Ask</span>
            </div>
        </button>
    );
}
