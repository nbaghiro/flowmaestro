import { Check, ChevronsUpDown, Plus, Building2, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Tooltip } from "../common/Tooltip";

interface WorkspaceSwitcherProps {
    isCollapsed?: boolean;
}

// Placeholder workspace data - will be replaced with actual store data
const PLACEHOLDER_WORKSPACE = {
    id: "personal",
    name: "Personal",
    type: "free" as const,
    memberCount: 1
};

export function WorkspaceSwitcher({ isCollapsed = false }: WorkspaceSwitcherProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    // Placeholder - will come from workspaceStore
    const currentWorkspace = PLACEHOLDER_WORKSPACE;

    // Collapsed view - just show icon with tooltip
    if (isCollapsed) {
        return (
            <div className="px-2 py-2 border-b border-border">
                <Tooltip
                    content={`${currentWorkspace.name} (${currentWorkspace.type})`}
                    position="right"
                    delay={200}
                >
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full p-2 hover:bg-muted rounded-lg transition-colors flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                        <Building2 className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        );
    }

    // Expanded view - compact dropdown trigger
    return (
        <div className="px-2 py-2 border-b border-border">
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isOpen
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Building2 className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium truncate">
                        {currentWorkspace.name}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-50" />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                        {/* Dropdown */}
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                            {/* Workspace List */}
                            <div className="py-1">
                                {/* Personal workspace item */}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-sm"
                                >
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="flex-1 text-left font-medium">
                                        {currentWorkspace.name}
                                    </span>
                                    <Check className="h-4 w-4 text-primary" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="border-t border-border py-1">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        // Will open create workspace dialog
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Create workspace</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        navigate("/workspace/settings");
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Users className="h-4 w-4" />
                                    <span>Manage members</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
