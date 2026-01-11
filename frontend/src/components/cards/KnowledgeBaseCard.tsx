import {
    BookOpen,
    Calendar,
    Trash2,
    MoreVertical,
    Edit2,
    FolderInput,
    FolderMinus,
    GripVertical,
    FileText,
    Layers,
    HardDrive
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { KnowledgeBaseSummary } from "@flowmaestro/shared";
import { Badge } from "../common/Badge";

export interface KnowledgeBaseCardProps {
    knowledgeBase: KnowledgeBaseSummary;
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

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function KnowledgeBaseCard({
    knowledgeBase: kb,
    isSelected = false,
    onClick,
    onContextMenu,
    onDragStart,
    onEdit,
    onMoveToFolder,
    onRemoveFromFolder,
    onDelete,
    currentFolderId
}: KnowledgeBaseCardProps) {
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
            className={`bg-card border rounded-lg p-5 hover:shadow-md transition-all group relative flex flex-col h-full cursor-pointer select-none ${
                isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary"
            }`}
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {/* Drag Handle - visible on hover */}
            {onDragStart && (
                <div
                    className="absolute bottom-2 right-2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            )}

            <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <div className="flex items-center gap-1">
                        <Badge variant="default" size="sm">
                            Documents
                        </Badge>
                        {kb.embeddingModel && (
                            <Badge variant="default" size="sm">
                                {kb.embeddingModel}
                            </Badge>
                        )}

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
                    {kb.name}
                </h3>

                {kb.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{kb.description}</p>
                )}

                {/* Spacer to push stats and date to bottom */}
                <div className="flex-1 min-h-4" />

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{kb.documentCount} docs</span>
                    </div>
                    {kb.chunkCount !== undefined && (
                        <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>{kb.chunkCount} chunks</span>
                        </div>
                    )}
                    {kb.totalSizeBytes !== undefined && (
                        <div className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            <span>{formatFileSize(kb.totalSizeBytes)}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created {formatDate(kb.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
