import {
    Bot,
    Calendar,
    Trash2,
    MoreVertical,
    Edit2,
    FolderInput,
    FolderMinus,
    GripVertical
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { AgentSummary } from "@flowmaestro/shared";
import { AgentPromptPreview } from "../common/AgentPromptPreview";
import { AgentToolIconList } from "../common/AgentToolIconList";
import { Badge } from "../common/Badge";
import type { Tool } from "../../lib/api";

export interface AgentCardProps {
    agent: AgentSummary;
    tools?: Tool[]; // Full tool objects for displaying tool icons
    isSelected?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onEdit?: () => void;
    onMoveToFolder?: () => void;
    onRemoveFromFolder?: () => void;
    onDelete?: () => void;
    currentFolderId?: string | null;
}

function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

export function AgentCard({
    agent,
    tools,
    isSelected = false,
    onClick,
    onContextMenu,
    onDragStart,
    onEdit,
    onMoveToFolder,
    onRemoveFromFolder,
    onDelete,
    currentFolderId
}: AgentCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        if (!isMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isMenuOpen]);

    return (
        <div
            className={`bg-card border rounded-lg overflow-hidden hover:shadow-md transition-all group relative cursor-pointer select-none flex flex-col h-full ${
                isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary"
            }`}
            onClick={onClick}
            onContextMenu={onContextMenu}
            draggable={!!onDragStart}
            onDragStart={onDragStart}
        >
            {/* DNA Preview */}
            <AgentPromptPreview
                systemPrompt={agent.systemPrompt}
                temperature={agent.temperature}
                height="h-24"
            />

            {/* Drag Handle - visible on hover */}
            {onDragStart && (
                <div
                    className="absolute bottom-2 right-2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 px-5 pt-5">
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
                        {(onEdit || onMoveToFolder || onDelete) && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMenuOpen(!isMenuOpen);
                                    }}
                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="More options"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                        {onEdit && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onEdit();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                Edit
                                            </button>
                                        )}
                                        {onMoveToFolder && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onMoveToFolder();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                            >
                                                <FolderInput className="w-4 h-4" />
                                                Move to folder
                                            </button>
                                        )}
                                        {onRemoveFromFolder && currentFolderId && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onRemoveFromFolder();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                            >
                                                <FolderMinus className="w-4 h-4" />
                                                Remove from folder
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsMenuOpen(false);
                                                    onDelete();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {agent.name}
                </h3>

                {agent.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {agent.description}
                    </p>
                )}
            </div>

            {/* Footer - Always at bottom */}
            <div className="mt-auto pt-4 px-5 pb-5">
                {/* Tool Icons Row - only show if full Tool objects are provided */}
                {tools && tools.length > 0 && (
                    <AgentToolIconList
                        tools={tools}
                        maxVisible={5}
                        iconSize="sm"
                        className="mb-3"
                    />
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created {formatDate(agent.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
