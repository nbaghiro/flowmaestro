import { FileText, CheckCircle, Loader2, XCircle, Clock, Trash2, RefreshCw } from "lucide-react";
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
            return "Processing...";
        case "failed":
            return "Failed";
        case "pending":
            return "Pending";
        default:
            return status;
    }
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
    return (
        <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Documents</h2>
            </div>

            {documents.length === 0 ? (
                <div className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No documents yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Upload a file or add a URL to get started
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-border">
                    {documents.map((doc) => {
                        const isSelected = selectedDocumentId === doc.id;
                        const isClickable = doc.status === "ready" && onDocumentClick;

                        return (
                            <div
                                key={doc.id}
                                className={`p-4 transition-colors ${
                                    isSelected
                                        ? "bg-primary/10 border-l-2 border-l-primary"
                                        : "hover:bg-muted/50"
                                } ${isClickable ? "cursor-pointer" : ""}`}
                                onClick={() => {
                                    if (isClickable) {
                                        onDocumentClick(doc);
                                    }
                                }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            <span className="font-medium truncate">
                                                {doc.source_type === "url" && doc.source_url
                                                    ? doc.source_url
                                                    : doc.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground uppercase flex-shrink-0">
                                                {doc.file_type}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>
                                                {doc.file_size
                                                    ? formatFileSize(Number(doc.file_size))
                                                    : "N/A"}
                                            </span>
                                            <span>
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </span>
                                            {doc.source_type === "url" && doc.source_url && (
                                                <a
                                                    href={doc.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    View Source
                                                </a>
                                            )}
                                        </div>

                                        {doc.error_message && (
                                            <p className="text-sm text-red-600 mt-1">
                                                {doc.error_message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(doc.status)}
                                            <span className="text-sm">
                                                {getStatusText(doc.status)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {doc.status === "failed" && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReprocess(doc.id);
                                                    }}
                                                    disabled={processingDocId === doc.id}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Reprocess document"
                                                >
                                                    {processingDocId === doc.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteClick(doc.id);
                                                }}
                                                disabled={processingDocId === doc.id}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete document"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
