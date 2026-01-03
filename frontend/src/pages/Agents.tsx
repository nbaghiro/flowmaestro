import { Plus, Bot, Trash2, MoreVertical, Calendar, Edit2 } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/common/Alert";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { ContextMenu, type ContextMenuItem } from "../components/common/ContextMenu";
import { PageHeader } from "../components/common/PageHeader";
import { LoadingState } from "../components/common/Spinner";
import { logger } from "../lib/logger";
import { useAgentStore } from "../stores/agentStore";

interface Agent {
    id: string;
    name: string;
    description?: string;
    provider: string;
    model: string;
    created_at: string;
}

export function Agents() {
    const navigate = useNavigate();
    const { agents, isLoading, error, fetchAgents, deleteAgent } = useAgentStore();
    const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [contextMenu, setContextMenu] = useState<{
        isOpen: boolean;
        position: { x: number; y: number };
    }>({ isOpen: false, position: { x: 0, y: 0 } });
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [openMenuId]);

    const handleDeleteAgent = async () => {
        if (!agentToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAgent(agentToDelete.id);
            await fetchAgents();
            setAgentToDelete(null);
        } catch (error) {
            logger.error("Failed to delete agent", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    };

    // Selection handlers for batch operations
    const handleCardClick = useCallback(
        (e: React.MouseEvent, agent: Agent) => {
            if (e.shiftKey) {
                e.preventDefault();
                setSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(agent.id)) {
                        newSet.delete(agent.id);
                    } else {
                        newSet.add(agent.id);
                    }
                    return newSet;
                });
            } else if (selectedIds.size === 0) {
                navigate(`/agents/${agent.id}`);
            } else {
                // Clear selection on normal click when items are selected
                setSelectedIds(new Set());
            }
        },
        [navigate, selectedIds.size]
    );

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, agent: Agent) => {
            e.preventDefault();
            // If right-clicking on an unselected item, select only that item
            if (!selectedIds.has(agent.id)) {
                setSelectedIds(new Set([agent.id]));
            }
            setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY }
            });
        },
        [selectedIds]
    );

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;

        setIsBatchDeleting(true);
        try {
            // Delete all selected agents
            const deletePromises = Array.from(selectedIds).map((id) => deleteAgent(id));
            await Promise.all(deletePromises);

            // Refresh the agent list and clear selection
            await fetchAgents();
            setSelectedIds(new Set());
            setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
        } catch (error: unknown) {
            logger.error("Failed to delete agents", error);
        } finally {
            setIsBatchDeleting(false);
        }
    };

    const closeContextMenu = useCallback(() => {
        setContextMenu({ isOpen: false, position: { x: 0, y: 0 } });
    }, []);

    const contextMenuItems: ContextMenuItem[] = [
        {
            label: `Delete ${selectedIds.size} agent${selectedIds.size !== 1 ? "s" : ""}`,
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleBatchDelete,
            variant: "danger",
            disabled: isBatchDeleting
        }
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Agents"
                description={
                    selectedIds.size > 0
                        ? `${selectedIds.size} selected`
                        : "Create and manage AI agents that can use tools and workflows"
                }
                action={
                    selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                                Clear selection
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBatchDelete}
                                disabled={isBatchDeleting}
                                loading={isBatchDeleting}
                            >
                                {!isBatchDeleting && <Trash2 className="w-4 h-4" />}
                                Delete selected
                            </Button>
                        </div>
                    ) : (
                        <Button variant="primary" onClick={() => navigate("/agents/new")}>
                            <Plus className="w-4 h-4" />
                            New Agent
                        </Button>
                    )
                }
            />

            {/* Error message */}
            {error && (
                <div className="mb-4">
                    <Alert variant="error">{error}</Alert>
                </div>
            )}

            {/* Agent Grid */}
            {isLoading ? (
                <LoadingState message="Loading agents..." />
            ) : agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-card">
                    <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No agents yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Create your first AI agent to automate tasks, answer questions, or execute
                        workflows.
                    </p>
                    <Button variant="primary" onClick={() => navigate("/agents/new")} size="lg">
                        <Plus className="w-4 h-4" />
                        Create Your First Agent
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all group relative cursor-pointer select-none ${
                                selectedIds.has(agent.id)
                                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                                    : "border-border hover:border-primary"
                            }`}
                            onClick={(e) => handleCardClick(e, agent)}
                            onContextMenu={(e) => handleContextMenu(e, agent)}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <Bot className="w-5 h-5 text-primary" />
                                    <div className="flex items-center gap-1">
                                        <Badge variant="default" size="sm">
                                            {agent.provider}
                                        </Badge>
                                        <Badge variant="default" size="sm">
                                            {agent.model}
                                        </Badge>

                                        {/* Menu Button */}
                                        <div
                                            className="relative"
                                            ref={openMenuId === agent.id ? menuRef : null}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(
                                                        openMenuId === agent.id ? null : agent.id
                                                    );
                                                }}
                                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                title="More options"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === agent.id && (
                                                <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            navigate(`/agents/${agent.id}`);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            setAgentToDelete(agent);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {agent.name}
                                </h3>

                                {agent.description && (
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {agent.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Created {formatDate(agent.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {agentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Agent</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{agentToDelete.name}"? This action
                            cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setAgentToDelete(null)}
                                disabled={isDeleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAgent}
                                disabled={isDeleting}
                                loading={isDeleting}
                            >
                                {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Menu for batch operations */}
            <ContextMenu
                isOpen={contextMenu.isOpen}
                position={contextMenu.position}
                items={contextMenuItems}
                onClose={closeContextMenu}
            />
        </div>
    );
}
