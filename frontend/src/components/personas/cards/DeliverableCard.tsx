import {
    FileText,
    FileSpreadsheet,
    FileJson,
    FileCode,
    Image,
    Globe,
    Download,
    Eye,
    ExternalLink,
    File
} from "lucide-react";
import React, { useState } from "react";
import { DeliverablePreviewModal } from "../modals/DeliverablePreviewModal";
import type { PersonaInstanceDeliverable, DeliverableType } from "../../../lib/api";

interface DeliverableCardProps {
    deliverable: PersonaInstanceDeliverable;
}

// Map deliverable types to icons
const typeIcons: Record<DeliverableType | string, React.ReactNode> = {
    markdown: <FileText className="w-5 h-5" />,
    csv: <FileSpreadsheet className="w-5 h-5" />,
    json: <FileJson className="w-5 h-5" />,
    pdf: <FileText className="w-5 h-5 text-red-500" />,
    code: <FileCode className="w-5 h-5" />,
    image: <Image className="w-5 h-5" />,
    html: <Globe className="w-5 h-5" />
};

// Map types to colors
const typeColors: Record<DeliverableType | string, string> = {
    markdown: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    csv: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    json: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    code: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    image: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
    html: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
};

// Check if deliverable can be previewed
function canPreview(deliverable: PersonaInstanceDeliverable): boolean {
    const previewableTypes = ["markdown", "csv", "json", "code", "html"];
    return previewableTypes.includes(deliverable.type) && !!deliverable.content;
}

// Format the created date
function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export const DeliverableCard: React.FC<DeliverableCardProps> = ({ deliverable }) => {
    const [showPreview, setShowPreview] = useState(false);

    const icon = typeIcons[deliverable.type] || <File className="w-5 h-5" />;
    const colorClass = typeColors[deliverable.type] || "bg-slate-100 text-slate-700";
    const hasPreview = canPreview(deliverable);
    const hasDownload = !!deliverable.file_url || !!deliverable.content;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (deliverable.file_url) {
            window.open(deliverable.file_url, "_blank");
        } else if (deliverable.content) {
            // Create a downloadable blob from content
            const blob = new Blob([deliverable.content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${deliverable.name}.${deliverable.file_extension || "txt"}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const handlePreview = () => {
        if (hasPreview) {
            setShowPreview(true);
        }
    };

    return (
        <>
            <div
                className={`group p-3 bg-muted rounded-lg transition-colors ${
                    hasPreview ? "hover:bg-muted/80 cursor-pointer" : ""
                }`}
                onClick={handlePreview}
            >
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>{icon}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                            {deliverable.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground uppercase">
                                {deliverable.type}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatDate(deliverable.created_at)}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {hasPreview && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPreview(true);
                                }}
                                className="p-1.5 hover:bg-background rounded transition-colors"
                                title="Preview"
                            >
                                <Eye className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                        {hasDownload && (
                            <button
                                onClick={handleDownload}
                                className="p-1.5 hover:bg-background rounded transition-colors"
                                title="Download"
                            >
                                <Download className="w-4 h-4 text-muted-foreground" />
                            </button>
                        )}
                        {deliverable.file_url && (
                            <a
                                href={deliverable.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 hover:bg-background rounded transition-colors"
                                title="Open in new tab"
                            >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Content preview snippet */}
                {(deliverable.preview || deliverable.content) && (
                    <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                            {deliverable.preview ||
                                (deliverable.content
                                    ? deliverable.content.slice(0, 150) +
                                      (deliverable.content.length > 150 ? "..." : "")
                                    : "")}
                        </p>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <DeliverablePreviewModal
                    deliverable={deliverable}
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                />
            )}
        </>
    );
};
