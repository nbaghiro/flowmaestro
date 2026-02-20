import {
    FileText,
    CheckCircle,
    Loader2,
    XCircle,
    Clock,
    Trash2,
    RefreshCw,
    Globe
} from "lucide-react";
import type { KnowledgeDocument } from "../../lib/api";

interface DocumentListProps {
    documents: KnowledgeDocument[];
    onDeleteClick: (docId: string) => void;
    onReprocess: (docId: string) => Promise<void>;
    processingDocId: string | null;
    onDocumentClick?: (doc: KnowledgeDocument) => void;
    selectedDocumentId?: string | null;
}

function getStatusIcon(status: string) {
    switch (status) {
        case "ready":
            return <CheckCircle className="w-4 h-4 text-green-600" />;
        case "processing":
            return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
        case "failed":
            return <XCircle className="w-4 h-4 text-red-600" />;
        case "pending":
            return <Clock className="w-4 h-4 text-yellow-600" />;
        default:
            return null;
    }
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

export function DocumentList({
    documents,
    onDeleteClick,
    onReprocess,
    processingDocId,
    onDocumentClick,
    selectedDocumentId
}: DocumentListProps) {
    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-foreground font-medium mb-1">No documents yet</p>
                <p className="text-sm text-muted-foreground">
                    Upload a file or add a URL to get started
                </p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            {documents.map((doc, index) => {
                const isSelected = selectedDocumentId === doc.id;
                const isClickable = doc.status === "ready" && onDocumentClick;
                const isProcessing = processingDocId === doc.id;

                return (
                    <div
                        key={doc.id}
                        className={`
                            group flex items-center gap-3 px-4 py-4 transition-all
                            ${index !== 0 ? "border-t border-border" : ""}
                            ${isSelected ? "bg-primary/5" : "hover:bg-muted/50"}
                            ${isClickable ? "cursor-pointer" : ""}
                        `}
                        onClick={() => {
                            if (isClickable) {
                                onDocumentClick(doc);
                            }
                        }}
                    >
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            {getDocumentIcon(doc)}
                        </div>

                        {/* Name + URL */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground text-sm leading-tight truncate">
                                {doc.source_type === "url" && doc.source_url
                                    ? new URL(doc.source_url).hostname
                                    : doc.name}
                            </h4>
                            {doc.source_type === "url" && doc.source_url && (
                                <p
                                    className="text-xs text-muted-foreground truncate"
                                    title={doc.source_url}
                                >
                                    {doc.source_url}
                                </p>
                            )}
                            {doc.error_message && (
                                <p
                                    className="text-xs text-red-600 truncate"
                                    title={doc.error_message}
                                >
                                    {doc.error_message}
                                </p>
                            )}
                        </div>

                        {/* Type Badge */}
                        <span className="text-xs text-muted-foreground uppercase font-medium px-1.5 py-0.5 bg-muted rounded flex-shrink-0">
                            {doc.file_type}
                        </span>

                        {/* File Size */}
                        <span
                            className={`text-xs text-muted-foreground w-16 flex-shrink-0 ${doc.file_size != null ? "text-right" : "text-center"}`}
                        >
                            {doc.file_size != null ? formatFileSize(Number(doc.file_size)) : "-"}
                        </span>

                        {/* Status */}
                        <div className="flex items-center gap-1 w-24 flex-shrink-0">
                            {getStatusIcon(doc.status)}
                            <span
                                className={`text-xs ${
                                    doc.status === "ready"
                                        ? "text-green-600"
                                        : doc.status === "failed"
                                          ? "text-red-600"
                                          : doc.status === "processing"
                                            ? "text-blue-600"
                                            : "text-yellow-600"
                                }`}
                            >
                                {getStatusText(doc.status)}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {doc.status === "failed" && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onReprocess(doc.id);
                                    }}
                                    disabled={isProcessing}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors disabled:opacity-50"
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
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors disabled:opacity-50"
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
