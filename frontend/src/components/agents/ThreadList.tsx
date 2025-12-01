import {
    MessageSquare,
    Plus,
    MoreVertical,
    Archive,
    Trash2,
    Edit2,
    Check,
    X,
    Loader2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Input } from "../common/Input";
import type { Thread } from "../../lib/api";

interface ThreadListProps {
    threads: Thread[];
    currentThread: Thread | null;
    onThreadSelect: (thread: Thread) => void;
    onNewThread: () => void;
    onUpdateTitle: (threadId: string, title: string) => Promise<void>;
    onArchiveThread: (threadId: string) => Promise<void>;
    onDeleteThread: (threadId: string) => Promise<void>;
    isLoading?: boolean;
}

export function ThreadList({
    threads,
    currentThread,
    onThreadSelect,
    onNewThread,
    onUpdateTitle,
    onArchiveThread,
    onDeleteThread,
    isLoading = false
}: ThreadListProps) {
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

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

    // Focus edit input when editing starts
    useEffect(() => {
        if (editingThreadId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingThreadId]);

    const handleStartEdit = (thread: Thread) => {
        setEditingThreadId(thread.id);
        setEditTitle(thread.title || `Thread ${thread.id.slice(0, 8)}`);
        setOpenMenuId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingThreadId || !editTitle.trim()) return;

        setIsUpdating(true);
        try {
            await onUpdateTitle(editingThreadId, editTitle.trim());
            setEditingThreadId(null);
        } catch (error) {
            console.error("Failed to update thread title:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingThreadId(null);
        setEditTitle("");
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Just now";
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    return (
        <div className="h-full flex flex-col bg-white border-r border-border">
            {/* Header */}
            <div className="p-4 border-b border-border flex-shrink-0">
                <button
                    onClick={onNewThread}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg",
                        "bg-primary text-primary-foreground",
                        "hover:bg-primary/90 transition-colors",
                        "text-sm font-medium"
                    )}
                >
                    <Plus className="w-4 h-4" />
                    New Conversation
                </button>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                ) : threads.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Start a new conversation to begin</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {threads.map((thread) => {
                            const isActive = currentThread?.id === thread.id;
                            const isEditing = editingThreadId === thread.id;

                            return (
                                <div
                                    key={thread.id}
                                    className={cn(
                                        "group rounded-lg transition-colors",
                                        isActive ? "bg-primary/10" : "hover:bg-muted"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 p-3",
                                            !isEditing && "cursor-pointer"
                                        )}
                                        onClick={() => !isEditing && onThreadSelect(thread)}
                                    >
                                        <MessageSquare
                                            className={cn(
                                                "w-4 h-4 flex-shrink-0",
                                                isActive ? "text-primary" : "text-muted-foreground"
                                            )}
                                        />

                                        {isEditing ? (
                                            <div className="flex-1 flex items-center gap-1">
                                                <Input
                                                    ref={editInputRef}
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(
                                                        e: React.ChangeEvent<HTMLInputElement>
                                                    ) => setEditTitle(e.target.value)}
                                                    onKeyDown={(
                                                        e: React.KeyboardEvent<HTMLInputElement>
                                                    ) => {
                                                        if (e.key === "Enter") handleSaveEdit();
                                                        if (e.key === "Escape") handleCancelEdit();
                                                    }}
                                                    disabled={isUpdating}
                                                    className={cn(
                                                        "flex-1 px-2 py-1 text-sm rounded",
                                                        "bg-background border border-border",
                                                        "focus:outline-none focus:ring-2 focus:ring-primary",
                                                        "disabled:opacity-50"
                                                    )}
                                                />
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={isUpdating || !editTitle.trim()}
                                                    className="p-1 hover:bg-background rounded disabled:opacity-50"
                                                >
                                                    {isUpdating ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    disabled={isUpdating}
                                                    className="p-1 hover:bg-background rounded disabled:opacity-50"
                                                >
                                                    <X className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={cn(
                                                            "text-sm font-medium truncate",
                                                            isActive
                                                                ? "text-primary"
                                                                : "text-foreground"
                                                        )}
                                                    >
                                                        {thread.title ||
                                                            `Thread ${thread.id.slice(0, 8)}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(thread.last_message_at)}
                                                    </p>
                                                </div>

                                                <div
                                                    className="relative opacity-0 group-hover:opacity-100 transition-opacity"
                                                    ref={openMenuId === thread.id ? menuRef : null}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            setOpenMenuId(
                                                                openMenuId === thread.id
                                                                    ? null
                                                                    : thread.id
                                                            )
                                                        }
                                                        className="p-1 hover:bg-muted rounded transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                                    </button>

                                                    {openMenuId === thread.id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-10">
                                                            <button
                                                                onClick={() =>
                                                                    handleStartEdit(thread)
                                                                }
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                Rename
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    onArchiveThread(thread.id);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                            >
                                                                <Archive className="w-4 h-4" />
                                                                Archive
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setOpenMenuId(null);
                                                                    onDeleteThread(thread.id);
                                                                }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
