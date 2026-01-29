import { FileText, Box, HardDrive, CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import type { KnowledgeBaseStats, KnowledgeDocument } from "../../lib/api";

interface KBOverviewSidebarProps {
    stats: KnowledgeBaseStats | null;
    documents: KnowledgeDocument[];
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function KBOverviewSidebar({ stats, documents }: KBOverviewSidebarProps) {
    // Calculate status breakdown from documents
    const statusCounts = documents.reduce(
        (acc, doc) => {
            acc[doc.status] = (acc[doc.status] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    const readyCount = statusCounts.ready || 0;
    const processingCount = (statusCounts.processing || 0) + (statusCounts.pending || 0);
    const failedCount = statusCounts.failed || 0;

    return (
        <div className="h-full flex flex-col py-4 px-3">
            {/* Overview Section */}
            <div className="mb-5">
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Overview
                </h3>
                <div className="space-y-1">
                    {/* Document Count */}
                    <div className="flex items-center gap-2 px-1 py-1.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                            {stats?.document_count ?? documents.length}
                        </span>
                        <span className="text-xs text-muted-foreground">Documents</span>
                    </div>

                    {/* Chunk Count */}
                    <div className="flex items-center gap-2 px-1 py-1.5">
                        <Box className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                            {stats?.chunk_count?.toLocaleString() ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">Chunks</span>
                    </div>

                    {/* Total Size */}
                    <div className="flex items-center gap-2 px-1 py-1.5">
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                            {stats ? formatFileSize(stats.total_size_bytes) : "—"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border mb-5" />

            {/* Status Section */}
            <div>
                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Status
                </h3>
                <div className="space-y-0.5">
                    {/* Ready */}
                    <div className="flex items-center justify-between px-1 py-1.5">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Ready</span>
                        </div>
                        <span className="text-sm text-foreground">{readyCount}</span>
                    </div>

                    {/* Processing */}
                    {processingCount > 0 && (
                        <div className="flex items-center justify-between px-1 py-1.5">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                                <span className="text-sm text-muted-foreground">Processing</span>
                            </div>
                            <span className="text-sm text-foreground">{processingCount}</span>
                        </div>
                    )}

                    {/* Pending (show if any) */}
                    {statusCounts.pending > 0 && processingCount === 0 && (
                        <div className="flex items-center justify-between px-1 py-1.5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Pending</span>
                            </div>
                            <span className="text-sm text-foreground">{statusCounts.pending}</span>
                        </div>
                    )}

                    {/* Failed */}
                    {failedCount > 0 && (
                        <div className="flex items-center justify-between px-1 py-1.5">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Failed</span>
                            </div>
                            <span className="text-sm text-foreground">{failedCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
