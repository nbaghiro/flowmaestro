import {
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
import { getKBCategoryById, type KnowledgeBaseSummary } from "@flowmaestro/shared";

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

// Generate a consistent color based on the KB id (fallback for KBs without category)
function getColorFromId(id: string): string {
    const colors = ["blue", "emerald", "violet", "amber", "cyan", "rose", "orange", "purple"];
    // Use a simple sum of char codes multiplied by position for better distribution
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash += id.charCodeAt(i) * (i + 1);
    }
    return colors[hash % colors.length];
}

// Get color from category, falling back to ID-based color
function getColorForKB(kb: KnowledgeBaseSummary): string {
    if (kb.category) {
        const category = getKBCategoryById(kb.category);
        if (category) {
            return category.color;
        }
    }
    // Fallback to ID-based color for KBs without category
    return getColorFromId(kb.id);
}

// Map color names to Tailwind background classes
// Using same *-500 shade as the mosaic preview tiles
function getAccentColorClass(color: string): string {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-500",
        emerald: "bg-emerald-500",
        violet: "bg-violet-500",
        amber: "bg-amber-500",
        cyan: "bg-cyan-500",
        rose: "bg-rose-500",
        orange: "bg-orange-500",
        purple: "bg-purple-500",
        gray: "bg-gray-500"
    };
    return colorMap[color] || "bg-blue-500";
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

    const color = getColorForKB(kb);

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
            className={`bg-card border rounded-lg overflow-hidden hover:shadow-md transition-all group relative flex h-full cursor-pointer select-none ${
                isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary"
            }`}
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            onClick={onClick}
            onContextMenu={onContextMenu}
        >
            {/* Left color accent bar */}
            <div className={`w-1 flex-shrink-0 ${getAccentColorClass(color)}`} />

            {/* Content */}
            <div className="p-4 flex flex-col flex-1">
                {/* Header with menu */}
                <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 pr-2">
                        {kb.name}
                    </h3>

                    {/* Menu Button */}
                    {(onEdit || onMoveToFolder || onDelete) && (
                        <div className="relative flex-shrink-0" ref={menuRef}>
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

                {kb.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {kb.description}
                    </p>
                )}

                {/* Spacer to push stats and date to bottom */}
                <div className="flex-1 min-h-2" />

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{kb.documentCount} docs</span>
                    </div>
                    {kb.chunkCount !== undefined && (
                        <div className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            <span>{kb.chunkCount.toLocaleString()} chunks</span>
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

            {/* Drag Handle - visible on hover */}
            {onDragStart && (
                <div
                    className="absolute bottom-2 right-2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <GripVertical className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}
