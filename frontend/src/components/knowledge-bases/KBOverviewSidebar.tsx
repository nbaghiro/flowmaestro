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
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Overview
                </h3>
                <div className="space-y-2">
                    {/* Document Count */}
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-foreground leading-none">
                                {stats?.document_count ?? documents.length}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Documents</p>
                        </div>
                    </div>

                    {/* Chunk Count */}
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Box className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-foreground leading-none">
                                {stats?.chunk_count?.toLocaleString() ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Chunks</p>
                        </div>
                    </div>

                    {/* Total Size */}
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                            <HardDrive className="w-4 h-4 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-foreground leading-none">
                                {stats ? formatFileSize(stats.total_size_bytes) : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">Total Size</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border mb-6" />

            {/* Status Section */}
            <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                    Status
                </h3>
                <div className="space-y-1.5">
                    {/* Ready */}
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-foreground">Ready</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">{readyCount}</span>
                    </div>

                    {/* Processing */}
                    {processingCount > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                <span className="text-sm text-foreground">Processing</span>
                            </div>
                            <span className="text-sm font-medium text-blue-600">
                                {processingCount}
                            </span>
                        </div>
                    )}

                    {/* Pending (show if any) */}
                    {statusCounts.pending > 0 && processingCount === 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm text-foreground">Pending</span>
                            </div>
                            <span className="text-sm font-medium text-yellow-600">
                                {statusCounts.pending}
                            </span>
                        </div>
                    )}

                    {/* Failed */}
                    {failedCount > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-sm text-foreground">Failed</span>
                            </div>
                            <span className="text-sm font-medium text-red-600">{failedCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
