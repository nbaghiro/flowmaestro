import { FileText, Loader2, Trash2, RefreshCw, Globe } from "lucide-react";
import type { KnowledgeDocument } from "../../lib/api";

interface DocumentGridProps {
    documents: KnowledgeDocument[];
    onDeleteClick: (docId: string) => void;
    onReprocess: (docId: string) => Promise<void>;
    processingDocId: string | null;
    onDocumentClick?: (doc: KnowledgeDocument) => void;
    selectedDocumentId?: string | null;
}

function getStatusText(status: string) {
    switch (status) {
        case "ready":
            return "Ready";
        case "processing":
            return "Processing";
        case "failed":
            return "Failed";
        case "pending":
            return "Pending";
        default:
            return status;
    }
}

function getDocumentIcon(doc: KnowledgeDocument) {
    if (doc.source_type === "url") {
        return <Globe className="w-4 h-4 text-muted-foreground" />;
    }
    return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function DocumentGrid({
    documents,
    onDeleteClick,
    onReprocess,
    processingDocId,
    onDocumentClick,
    selectedDocumentId
}: DocumentGridProps) {
    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-foreground font-medium mb-1">No documents yet</p>
                <p className="text-sm text-muted-foreground">
                    Upload a file or add a URL to get started
                </p>
            </div>
        );
    }

    return (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
            {documents.map((doc, index) => {
                const isSelected = selectedDocumentId === doc.id;
                const isClickable = doc.status === "ready" && onDocumentClick;
                const isProcessing = processingDocId === doc.id;
                const isLast = index === documents.length - 1;

                const displayName =
                    doc.source_type === "url" && doc.source_url
                        ? new URL(doc.source_url).hostname
                        : doc.name;

                return (
                    <div
                        key={doc.id}
                        className={`
                            group flex items-center gap-3 px-3 py-2.5 transition-colors
                            ${!isLast ? "border-b border-border" : ""}
                            ${isSelected ? "bg-muted" : "hover:bg-muted/50"}
                            ${isClickable ? "cursor-pointer" : ""}
                        `}
                        onClick={() => {
                            if (isClickable) {
                                onDocumentClick(doc);
                            }
                        }}
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0">{getDocumentIcon(doc)}</div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-sm text-foreground truncate"
                                title={
                                    doc.source_type === "url"
                                        ? (doc.source_url ?? undefined)
                                        : doc.name
                                }
                            >
                                {displayName}
                            </p>
                            {doc.error_message && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {doc.error_message}
                                </p>
                            )}
                        </div>

                        {/* File Type Badge */}
                        <span className="flex-shrink-0 text-[10px] text-muted-foreground uppercase font-medium px-1.5 py-0.5 bg-muted rounded">
                            {doc.file_type}
                        </span>

                        {/* File Size */}
                        {doc.file_size != null && (
                            <span className="flex-shrink-0 text-xs text-muted-foreground w-16 text-right">
                                {formatFileSize(Number(doc.file_size))}
                            </span>
                        )}

                        {/* Status */}
                        <span
                            className={`flex-shrink-0 text-xs w-20 text-right ${
                                doc.status === "processing"
                                    ? "text-muted-foreground"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {doc.status === "processing" && (
                                <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                            )}
                            {getStatusText(doc.status)}
                        </span>

                        {/* Actions - visible on hover */}
                        <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.status === "failed" && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReprocess(doc.id);
                                    }}
                                    disabled={isProcessing}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
                                    title="Reprocess document"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteClick(doc.id);
                                }}
                                disabled={isProcessing}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
                                title="Delete document"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
