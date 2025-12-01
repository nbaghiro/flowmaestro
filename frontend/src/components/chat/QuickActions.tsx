import { Plus, Edit3, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ActionType } from "../../stores/chatStore";

interface QuickActionsProps {
    onActionClick: (action: ActionType, message: string) => void;
    hasNodes: boolean;
    hasSelectedNode: boolean;
    disabled?: boolean;
}

interface QuickAction {
    id: ActionType;
    label: string;
    message: string;
    icon: React.ElementType;
    color: string;
    showWhen?: "always" | "hasNodes" | "hasSelectedNode";
}

const quickActions: QuickAction[] = [
    {
        id: "add",
        label: "Add Node",
        message: "Help me add a new node",
        icon: Plus,
        color: "text-green-600 dark:text-green-400",
        showWhen: "always"
    },
    {
        id: "modify",
        label: "Modify",
        message: "Help me modify the selected node",
        icon: Edit3,
        color: "text-yellow-600 dark:text-yellow-400",
        showWhen: "hasSelectedNode"
    },
    {
        id: "remove",
        label: "Remove",
        message: "Help me remove a node from this workflow",
        icon: Trash2,
        color: "text-red-600 dark:text-red-400",
        showWhen: "hasNodes"
    }
];

export function QuickActions({
    onActionClick,
    hasNodes,
    hasSelectedNode,
    disabled = false
}: QuickActionsProps) {
    const shouldShowAction = (action: QuickAction): boolean => {
        if (action.showWhen === "always") return true;
        if (action.showWhen === "hasNodes") return hasNodes;
        if (action.showWhen === "hasSelectedNode") return hasSelectedNode;
        return true;
    };

    const visibleActions = quickActions.filter(shouldShowAction);

    return (
        <div className="border-b border-border pb-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-4">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2 px-4">
                {visibleActions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.id}
                            onClick={() => onActionClick(action.id, action.message)}
                            disabled={disabled}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg",
                                "bg-muted/50 hover:bg-muted transition-colors",
                                "text-sm font-medium text-left",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "border border-transparent hover:border-border"
                            )}
                        >
                            <Icon className={cn("w-4 h-4 flex-shrink-0", action.color)} />
                            <span className="text-foreground">{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
