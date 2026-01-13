import { Folder, MoreVertical, Trash2, Edit2, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { FolderWithCounts, FolderResourceType } from "@flowmaestro/shared";

interface FolderCardProps {
    folder: FolderWithCounts;
    onClick: (e: React.MouseEvent) => void;
    onEdit: () => void;
    onDelete: () => void;
    isSelected?: boolean;
    onContextMenu?: (e: React.MouseEvent) => void;
    /** Called when items are dropped onto this folder */
    onDrop?: (itemIds: string[], itemType: string) => void;
    /** When set, shows count for this specific item type instead of total */
    displayItemType?: FolderResourceType;
    /** Whether this is a subfolder (for visual distinction) */
    isSubfolder?: boolean;
    /** Whether this folder has children (subfolders) */
    hasChildren?: boolean;
    /** Whether this folder is expanded (showing children) */
    isExpanded?: boolean;
    /** Callback when expand/collapse button is clicked */
    onToggleExpand?: (e: React.MouseEvent) => void;
}

export function FolderCard({
    folder,
    onClick,
    onEdit,
    onDelete,
    isSelected = false,
    onContextMenu,
    onDrop,
    displayItemType,
    isSubfolder = false,
    hasChildren = false,
    isExpanded = false,
    onToggleExpand
}: FolderCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isMenuOpen]);

    const handleMenuClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        onEdit();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(false);
        onDelete();
    };

    // Format item count display
    const getItemCountDisplay = () => {
        // If a specific item type is requested, show that count
        if (displayItemType) {
            const typeLabels: Record<FolderResourceType, { singular: string; plural: string }> = {
                workflow: { singular: "workflow", plural: "workflows" },
                agent: { singular: "agent", plural: "agents" },
                "form-interface": { singular: "form", plural: "forms" },
                "chat-interface": { singular: "chat", plural: "chats" },
                "knowledge-base": { singular: "knowledge base", plural: "knowledge bases" }
            };
            const countMap: Record<FolderResourceType, number> = {
                workflow: folder.itemCounts.workflows,
                agent: folder.itemCounts.agents,
                "form-interface": folder.itemCounts.formInterfaces,
                "chat-interface": folder.itemCounts.chatInterfaces,
                "knowledge-base": folder.itemCounts.knowledgeBases
            };
            const count = countMap[displayItemType];
            const label = typeLabels[displayItemType];
            if (count === 0) return "Empty";
            if (count === 1) return `1 ${label.singular}`;
            return `${count} ${label.plural}`;
        }

        // Default: show total count
        const { total } = folder.itemCounts;
        if (total === 0) return "Empty";
        if (total === 1) return "1 item";
        return `${total} items`;
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDrop) {
            setIsDragOver(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (!onDrop) return;

        try {
            const data = e.dataTransfer.getData("application/json");
            if (data) {
                const { itemIds, itemType } = JSON.parse(data);
                if (itemIds && itemType) {
                    onDrop(itemIds, itemType);
                }
            }
        } catch {
            // Invalid drag data, ignore
        }
    };

    return (
        <div
            className={`rounded-lg transition-all group relative cursor-pointer select-none flex overflow-hidden ${
                isDragOver
                    ? "border-primary ring-2 ring-primary bg-primary/10 scale-[1.02]"
                    : isSelected
                      ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                      : isSubfolder
                        ? "bg-muted/20 border border border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/30 ml-4"
                        : "bg-card border border-border hover:shadow-md hover:border-primary"
            }`}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Left color accent bar */}
            {isSubfolder ? (
                <div
                    className="w-1 flex-shrink-0 opacity-60"
                    style={{ backgroundColor: folder.color }}
                />
            ) : (
                <div className="w-1 flex-shrink-0" style={{ backgroundColor: folder.color }} />
            )}

            {/* Content - horizontal layout */}
            <div
                className={`flex-1 flex items-center gap-2 ${isSubfolder ? "px-2.5 py-1.5" : "px-4 py-3"}`}
            >
                <Folder
                    className={`${isSubfolder ? "w-3 h-3" : "w-4 h-4"} ${isSubfolder ? "text-muted-foreground/60" : "text-muted-foreground"} flex-shrink-0`}
                />
                <span
                    className={`${isSubfolder ? "text-xs font-normal" : "text-sm font-medium"} ${isSubfolder ? "text-muted-foreground" : "text-foreground"} ${isSubfolder ? "" : "group-hover:text-primary"} transition-colors truncate`}
                >
                    {folder.name}
                </span>
                <span
                    className={`${isSubfolder ? "text-[10px]" : "text-xs"} ${isSubfolder ? "text-muted-foreground/60" : "text-muted-foreground"} flex-shrink-0`}
                >
                    {getItemCountDisplay()}
                </span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Menu Button */}
                <div className="relative flex-shrink-0" ref={isMenuOpen ? menuRef : null}>
                    <button
                        onClick={handleMenuClick}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="More options"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                            <button
                                onClick={handleEdit}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </button>
                        </div>
                    )}
                </div>

                {/* Expand/Collapse chevron for folders with children */}
                {hasChildren && !isSubfolder && onToggleExpand && (
                    <button
                        onClick={onToggleExpand}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex-shrink-0"
                        title={isExpanded ? "Collapse subfolders" : "Expand subfolders"}
                    >
                        <ChevronRight
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                    </button>
                )}
            </div>
        </div>
    );
}
