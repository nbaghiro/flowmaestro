import { FolderPlus, Folder, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

interface FolderDropdownProps {
    onCreateFolder: () => void;
    showFoldersSection: boolean;
    onToggleFoldersSection: () => void;
    className?: string;
}

export function FolderDropdown({
    onCreateFolder,
    showFoldersSection,
    onToggleFoldersSection,
    className
}: FolderDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    const handleCreateFolder = () => {
        onCreateFolder();
        setIsOpen(false);
    };

    const handleToggleFolders = () => {
        onToggleFoldersSection();
        // Don't close dropdown so user can see the toggle state
    };

    return (
        <div ref={dropdownRef} className={cn("relative", className)}>
            <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} title="Folder options">
                <FolderPlus className="w-4 h-4" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Folders
                    </div>
                    <button
                        onClick={handleCreateFolder}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                        <FolderPlus className="w-4 h-4" />
                        <span>Create new folder</span>
                    </button>
                    <button
                        onClick={handleToggleFolders}
                        className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors",
                            showFoldersSection
                                ? "text-primary bg-primary/5"
                                : "text-foreground hover:bg-muted"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            <span>Show folders</span>
                        </div>
                        {showFoldersSection && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                </div>
            )}
        </div>
    );
}
