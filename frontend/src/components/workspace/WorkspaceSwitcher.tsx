import { Check, ChevronsUpDown, Plus, Building2, Users, Crown, Loader2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { WorkspaceWithStats } from "@flowmaestro/shared";
import { cn } from "../../lib/utils";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { Tooltip } from "../common/Tooltip";

interface WorkspaceSwitcherProps {
    isCollapsed?: boolean;
}

function WorkspaceTypeBadge({ type }: { type: string }) {
    const colors = {
        free: "bg-muted text-muted-foreground",
        pro: "bg-blue-500/10 text-blue-500",
        team: "bg-purple-500/10 text-purple-500"
    };

    return (
        <span
            className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                colors[type as keyof typeof colors] || colors.free
            )}
        >
            {type}
        </span>
    );
}

function WorkspaceIcon({ category }: { category: string }) {
    if (category === "personal") {
        return <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
    }
    return <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />;
}

function WorkspaceItem({
    workspace,
    isSelected,
    isOwned,
    onClick
}: {
    workspace: WorkspaceWithStats;
    isSelected: boolean;
    isOwned: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-start gap-2.5 px-3 py-2 hover:bg-muted transition-colors text-sm",
                isSelected && "bg-muted/50"
            )}
        >
            <div className="mt-0.5">
                <WorkspaceIcon category={workspace.category} />
            </div>
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate max-w-[120px]">{workspace.name}</span>
                    {isOwned && <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                </div>
                <WorkspaceTypeBadge type={workspace.type} />
            </div>
            {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
        </button>
    );
}

export function WorkspaceSwitcher({ isCollapsed = false }: WorkspaceSwitcherProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const {
        ownedWorkspaces,
        memberWorkspaces,
        currentWorkspace,
        isLoading,
        isInitialized,
        initialize,
        switchWorkspace
    } = useWorkspaceStore();

    // Initialize workspace store on mount
    useEffect(() => {
        if (!isInitialized && !isLoading) {
            initialize();
        }
    }, [isInitialized, isLoading, initialize]);

    const handleWorkspaceSelect = async (workspaceId: string) => {
        if (workspaceId !== currentWorkspace?.id) {
            await switchWorkspace(workspaceId);
            // Reload the page to refresh data for new workspace context
            window.location.reload();
        }
        setIsOpen(false);
    };

    const handleCreateWorkspace = () => {
        setIsOpen(false);
        // Navigate to workspace settings with create dialog open
        navigate("/workspace/settings?action=create");
    };

    const handleManageMembers = () => {
        setIsOpen(false);
        navigate("/workspace/settings");
    };

    // Show loading state
    if (isLoading && !currentWorkspace) {
        if (isCollapsed) {
            return (
                <div className="px-2 py-2 border-b border-border">
                    <div className="w-full p-2 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                </div>
            );
        }
        return (
            <div className="px-2 py-2 border-b border-border">
                <div className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading workspace...</span>
                </div>
            </div>
        );
    }

    // No workspace yet - show placeholder until workspaces are created
    if (!currentWorkspace) {
        if (isCollapsed) {
            return (
                <div className="px-2 py-2 border-b border-border">
                    <div className="w-full p-2 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                </div>
            );
        }
        return (
            <div className="px-2 py-2 border-b border-border">
                <div className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
                    <Building2 className="w-5 h-5" />
                    <span>No workspace</span>
                </div>
            </div>
        );
    }

    // Collapsed view - just show icon with tooltip
    if (isCollapsed) {
        const CollapsedIcon = currentWorkspace.category === "personal" ? User : Building2;
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
                        <CollapsedIcon className="w-5 h-5" />
                    </button>
                </Tooltip>
            </div>
        );
    }

    const allWorkspaces = [...ownedWorkspaces, ...memberWorkspaces];
    const hasMultipleWorkspaces = allWorkspaces.length > 1;
    const TriggerIcon = currentWorkspace.category === "personal" ? User : Building2;

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
                    <TriggerIcon className="w-5 h-5 flex-shrink-0" />
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
                            <div className="py-1 max-h-[300px] overflow-y-auto">
                                {/* Owned Workspaces */}
                                {ownedWorkspaces.length > 0 && (
                                    <>
                                        {hasMultipleWorkspaces && (
                                            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Your Workspaces
                                            </div>
                                        )}
                                        {ownedWorkspaces.map((workspace) => (
                                            <WorkspaceItem
                                                key={workspace.id}
                                                workspace={workspace}
                                                isSelected={workspace.id === currentWorkspace.id}
                                                isOwned={true}
                                                onClick={() => handleWorkspaceSelect(workspace.id)}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* Member Workspaces */}
                                {memberWorkspaces.length > 0 && (
                                    <>
                                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Shared With You
                                        </div>
                                        {memberWorkspaces.map((workspace) => (
                                            <WorkspaceItem
                                                key={workspace.id}
                                                workspace={workspace}
                                                isSelected={workspace.id === currentWorkspace.id}
                                                isOwned={false}
                                                onClick={() => handleWorkspaceSelect(workspace.id)}
                                            />
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="border-t border-border py-1">
                                <button
                                    onClick={handleCreateWorkspace}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Create workspace</span>
                                </button>
                                <button
                                    onClick={handleManageMembers}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Users className="h-4 w-4" />
                                    <span>Manage workspace</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
