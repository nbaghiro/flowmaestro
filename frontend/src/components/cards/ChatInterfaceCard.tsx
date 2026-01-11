import {
    Trash2,
    MoreVertical,
    Edit,
    Eye,
    Copy,
    FolderInput,
    FolderMinus,
    GripVertical,
    Globe,
    Users
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ChatInterfaceSummary } from "@flowmaestro/shared";
import { Badge } from "../common/Badge";

export interface ChatInterfaceCardProps {
    chatInterface: ChatInterfaceSummary;
    isSelected?: boolean;
    onClick?: (e: React.MouseEvent) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onEdit?: () => void;
    onViewLive?: () => void;
    onViewSessions?: () => void;
    onDuplicate?: () => void;
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

export function ChatInterfaceCard({
    chatInterface: ci,
    isSelected = false,
    onClick,
    onContextMenu,
    onDragStart,
    onEdit,
    onViewLive,
    onViewSessions,
    onDuplicate,
    onMoveToFolder,
    onRemoveFromFolder,
    onDelete,
    currentFolderId
}: ChatInterfaceCardProps) {
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
            className={`group bg-card border rounded-lg transition-colors cursor-pointer select-none relative ${
                isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
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

            {/* Cover with icon */}
            <div className="relative">
                <div
                    className="h-32 w-full overflow-hidden rounded-t-lg"
                    style={{
                        backgroundColor: ci.coverType === "color" ? ci.coverValue : "#6366f1",
                        backgroundImage:
                            ci.coverType === "image"
                                ? `url(${ci.coverValue})`
                                : ci.coverType === "gradient"
                                  ? ci.coverValue
                                  : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center"
                    }}
                />
                {/* Icon overlay - positioned outside cover to avoid clip */}
                {ci.iconUrl && (
                    <div className="absolute -bottom-6 left-4">
                        <div className="w-12 h-12 rounded-lg bg-card border-2 border-background overflow-hidden flex items-center justify-center text-2xl">
                            {ci.iconUrl.startsWith("http") ? (
                                <img
                                    src={ci.iconUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                ci.iconUrl
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={`p-4 ${ci.iconUrl ? "pt-8" : ""}`}>
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{ci.title}</h3>
                        {ci.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {ci.description}
                            </p>
                        )}
                    </div>

                    {/* Menu */}
                    {(onEdit || onMoveToFolder || onDelete) && (
                        <div
                            className="relative"
                            ref={menuRef}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                    {onEdit && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onEdit();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit
                                        </button>
                                    )}
                                    {onViewLive && ci.status === "published" && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onViewLive();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Live
                                        </button>
                                    )}
                                    {onViewSessions && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onViewSessions();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <Users className="w-4 h-4" />
                                            Sessions ({ci.sessionCount ?? 0})
                                        </button>
                                    )}
                                    {onDuplicate && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onDuplicate();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Duplicate
                                        </button>
                                    )}
                                    {onMoveToFolder && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onMoveToFolder();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <FolderInput className="w-4 h-4" />
                                            Move to folder
                                        </button>
                                    )}
                                    {onRemoveFromFolder && currentFolderId && (
                                        <button
                                            onClick={() => {
                                                setIsMenuOpen(false);
                                                onRemoveFromFolder();
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                                        >
                                            <FolderMinus className="w-4 h-4" />
                                            Remove from folder
                                        </button>
                                    )}
                                    {onDelete && (
                                        <>
                                            <hr className="my-1 border-border" />
                                            <button
                                                onClick={() => {
                                                    setIsMenuOpen(false);
                                                    onDelete();
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Status & Stats */}
                <div className="flex items-center gap-2 mt-3">
                    <Badge variant={ci.status === "published" ? "success" : "default"}>
                        {ci.status === "published" ? (
                            <>
                                <Globe className="w-3 h-3 mr-1" />
                                Published
                            </>
                        ) : (
                            "Draft"
                        )}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {ci.sessionCount ?? 0} sessions
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {ci.messageCount ?? 0} messages
                    </span>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                    Updated {formatDate(ci.updatedAt)}
                </p>
            </div>
        </div>
    );
}
