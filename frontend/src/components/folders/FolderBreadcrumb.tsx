import { ChevronRight, Home } from "lucide-react";
import type { Folder } from "@flowmaestro/shared";

interface FolderBreadcrumbProps {
    /** The base resource type name (e.g., "Workflows", "Agents") */
    baseName: string;
    /** The current folder being viewed, or null if at root */
    folder: Folder | null;
    /** Callback when clicking the base/root link */
    onNavigateToRoot: () => void;
    /** Optional additional class names */
    className?: string;
}

export function FolderBreadcrumb({
    baseName,
    folder,
    onNavigateToRoot,
    className = ""
}: FolderBreadcrumbProps) {
    // Don't render if at root
    if (!folder) {
        return null;
    }

    return (
        <nav className={`flex items-center gap-2 text-sm ${className}`}>
            <button
                onClick={onNavigateToRoot}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
                <Home className="w-4 h-4" />
                <span>{baseName}</span>
            </button>

            <ChevronRight className="w-4 h-4 text-muted-foreground" />

            <div className="flex items-center gap-2">
                <div
                    className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color}30` }}
                >
                    <svg className="w-3 h-3" fill={folder.color} viewBox="0 0 24 24">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                </div>
                <span className="font-medium text-foreground">{folder.name}</span>
            </div>
        </nav>
    );
}
