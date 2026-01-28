import {
    FileText,
    CheckCircle,
    Loader2,
    XCircle,
    Clock,
    Trash2,
    RefreshCw,
    Globe,
    File,
    FileCode,
    FileJson,
    Table2
} from "lucide-react";
import type { KnowledgeDocument } from "../../lib/api";

interface DocumentGridProps {
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
            return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
        case "processing":
            return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />;
        case "failed":
            return <XCircle className="w-3.5 h-3.5 text-red-500" />;
        case "pending":
            return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
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
        return <Globe className="w-6 h-6 text-blue-500" />;
    }

    const fileType = doc.file_type?.toLowerCase();
    switch (fileType) {
        case "pdf":
            return <File className="w-6 h-6 text-red-500" />;
        case "docx":
        case "doc":
            return <FileText className="w-6 h-6 text-blue-600" />;
        case "html":
        case "htm":
            return <FileCode className="w-6 h-6 text-orange-500" />;
        case "json":
            return <FileJson className="w-6 h-6 text-yellow-600" />;
        case "csv":
            return <Table2 className="w-6 h-6 text-green-600" />;
        case "md":
        case "txt":
        default:
            return <FileText className="w-6 h-6 text-muted-foreground" />;
    }
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
                <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-foreground font-medium mb-1">No documents yet</p>
                <p className="text-sm text-muted-foreground">
                    Upload a file or add a URL to get started
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {documents.map((doc) => {
                const isSelected = selectedDocumentId === doc.id;
                const isClickable = doc.status === "ready" && onDocumentClick;
                const isProcessing = processingDocId === doc.id;

                return (
                    <div
                        key={doc.id}
                        className={`
                            group relative bg-card border rounded-lg p-4 transition-all
                            ${isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "border-border hover:border-muted-foreground/30"}
                            ${isClickable ? "cursor-pointer" : ""}
                        `}
                        onClick={() => {
                            if (isClickable) {
                                onDocumentClick(doc);
                            }
                        }}
                    >
                        {/* Top Row: Icon + Actions */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                {getDocumentIcon(doc)}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

                        {/* Document Name */}
                        <h4 className="font-medium text-foreground text-sm leading-tight mb-2 line-clamp-2">
                            {doc.source_type === "url" && doc.source_url
                                ? new URL(doc.source_url).hostname
                                : doc.name}
                        </h4>

                        {/* URL subtitle if applicable */}
                        {doc.source_type === "url" && doc.source_url && (
                            <p
                                className="text-xs text-muted-foreground truncate mb-2"
                                title={doc.source_url}
                            >
                                {doc.source_url}
                            </p>
                        )}

                        {/* Meta Row: Type, Size, Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground uppercase font-medium px-1.5 py-0.5 bg-muted rounded">
                                {doc.file_type}
                            </span>
                            {doc.file_size != null && (
                                <span className="text-xs text-muted-foreground">
                                    {formatFileSize(Number(doc.file_size))}
                                </span>
                            )}
                            <div className="flex items-center gap-1 ml-auto">
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
                        </div>

                        {/* Error message if failed */}
                        {doc.error_message && (
                            <p className="text-xs text-red-600 mt-2 line-clamp-2">
                                {doc.error_message}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
