import { Check, X, Loader2, File, AlertCircle, SkipForward, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { IntegrationImportJob, ImportFileResult } from "@flowmaestro/shared";
import { getKBImportProgress } from "../../lib/api";
import { Button } from "../common/Button";

interface IntegrationImportProgressProps {
    knowledgeBaseId: string;
    jobId: string;
    onComplete?: () => void;
    onClose?: () => void;
}

export function IntegrationImportProgress({
    knowledgeBaseId,
    jobId,
    onComplete,
    onClose
}: IntegrationImportProgressProps) {
    const [job, setJob] = useState<IntegrationImportJob | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const fetchProgress = async () => {
            try {
                const response = await getKBImportProgress(knowledgeBaseId, jobId);
                if (mounted && response.success) {
                    setJob(response.data);

                    // Stop polling when job is completed or failed
                    if (response.data.status === "completed" || response.data.status === "failed") {
                        if (intervalId) {
                            clearInterval(intervalId);
                        }
                        if (response.data.status === "completed") {
                            onComplete?.();
                        }
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : "Failed to load progress");
                }
            }
        };

        // Initial fetch
        fetchProgress();

        // Poll every 2 seconds
        intervalId = setInterval(fetchProgress, 2000);

        return () => {
            mounted = false;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [knowledgeBaseId, jobId, onComplete]);

    if (error) {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const progressPercent =
        job.total > 0
            ? Math.round(((job.completed + job.failed + job.skipped) / job.total) * 100)
            : 0;
    const isComplete = job.status === "completed" || job.status === "failed";

    return (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                    {isComplete ? "Import Complete" : "Importing Documents..."}
                </h3>
                {isComplete && onClose && (
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Close
                    </Button>
                )}
            </div>

            {/* Progress bar */}
            <div>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>
                        {job.completed + job.failed + job.skipped} of {job.total} files processed
                    </span>
                    <span>{progressPercent}%</span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${
                            job.status === "failed"
                                ? "bg-red-500"
                                : job.status === "completed"
                                  ? "bg-green-500"
                                  : "bg-primary"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-green-500" />
                    <span>{job.newFiles} new</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    <span>{job.updatedFiles} updated</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <SkipForward className="w-4 h-4 text-muted-foreground" />
                    <span>{job.skipped} skipped</span>
                </div>
                {job.failed > 0 && (
                    <div className="flex items-center gap-1.5">
                        <X className="w-4 h-4 text-red-500" />
                        <span>{job.failed} failed</span>
                    </div>
                )}
            </div>

            {/* Error message */}
            {job.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                    <div className="flex items-start gap-2 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{job.error}</span>
                    </div>
                </div>
            )}

            {/* File results (collapsible) */}
            {job.results.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none flex items-center gap-2">
                        <span className="group-open:rotate-90 transition-transform">▶</span>
                        Show file details
                    </summary>
                    <div className="mt-3 max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                        {job.results.map((result) => (
                            <FileResultRow key={result.fileId} result={result} />
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}

function FileResultRow({ result }: { result: ImportFileResult }) {
    const getStatusIcon = () => {
        switch (result.status) {
            case "completed":
                return <Check className="w-4 h-4 text-green-500" />;
            case "failed":
                return <X className="w-4 h-4 text-red-500" />;
            case "skipped":
                return <SkipForward className="w-4 h-4 text-muted-foreground" />;
            case "processing":
                return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
            default:
                return <File className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getActionLabel = () => {
        if (result.status === "skipped") {
            return result.skippedReason || "Skipped";
        }
        if (result.status === "failed") {
            return result.error || "Failed";
        }
        if (result.action === "created") {
            return "New";
        }
        if (result.action === "updated") {
            return "Updated";
        }
        if (result.action === "unchanged") {
            return "Unchanged";
        }
        return result.status;
    };

    return (
        <div className="flex items-center gap-3 p-3">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{result.fileName}</p>
            </div>
            <span
                className={`text-xs px-2 py-0.5 rounded ${
                    result.status === "failed"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : result.status === "skipped"
                          ? "bg-muted text-muted-foreground"
                          : result.action === "created"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : result.action === "updated"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                }`}
            >
                {getActionLabel()}
            </span>
        </div>
    );
}
