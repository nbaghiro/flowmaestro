import {
    Folder,
    File,
    Search,
    RefreshCw,
    Trash2,
    Clock,
    Check,
    AlertCircle,
    Loader2,
    Settings2
} from "lucide-react";
import { useState } from "react";
import type { KnowledgeBaseSource } from "@flowmaestro/shared";
import { Button } from "../common/Button";
import { ConfirmDialog } from "../common/ConfirmDialog";

interface IntegrationSourcesPanelProps {
    sources: KnowledgeBaseSource[];
    onSync: (sourceId: string) => Promise<void>;
    onDelete: (sourceId: string) => Promise<void>;
    onUpdate: (
        sourceId: string,
        syncEnabled: boolean,
        syncIntervalMinutes?: number
    ) => Promise<void>;
    isSyncing: Set<string>;
}

export function IntegrationSourcesPanel({
    sources,
    onSync,
    onDelete,
    onUpdate,
    isSyncing
}: IntegrationSourcesPanelProps) {
    const [deleteSourceId, setDeleteSourceId] = useState<string | null>(null);
    const [editSourceId, setEditSourceId] = useState<string | null>(null);

    if (sources.length === 0) {
        return null;
    }

    const getSourceIcon = (sourceType: string) => {
        switch (sourceType) {
            case "folder":
                return <Folder className="w-4 h-4" />;
            case "search":
                return <Search className="w-4 h-4" />;
            default:
                return <File className="w-4 h-4" />;
        }
    };

    const getSourceLabel = (source: KnowledgeBaseSource) => {
        if (source.sourceType === "folder") {
            return source.sourceConfig.folderPath || source.sourceConfig.folderId || "Root";
        }
        if (source.sourceType === "search") {
            return `Search: "${source.sourceConfig.searchQuery}"`;
        }
        const fileCount = source.sourceConfig.fileIds?.length || 0;
        return `${fileCount} file${fileCount !== 1 ? "s" : ""}`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
                return <Check className="w-4 h-4 text-green-500" />;
            case "syncing":
                return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
            case "failed":
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const formatLastSync = (lastSyncedAt: string | null) => {
        if (!lastSyncedAt) return "Never synced";
        const date = new Date(lastSyncedAt);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    const handleDelete = async () => {
        if (deleteSourceId) {
            await onDelete(deleteSourceId);
            setDeleteSourceId(null);
        }
    };

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Integration Sources</h2>

            <div className="space-y-3">
                {sources.map((source) => (
                    <div
                        key={source.id}
                        className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-muted-foreground">
                                {getSourceIcon(source.sourceType)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">{source.provider}</span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-sm text-muted-foreground truncate">
                                        {getSourceLabel(source)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {getStatusIcon(source.syncStatus)}
                                    <span className="text-xs text-muted-foreground">
                                        {formatLastSync(source.lastSyncedAt)}
                                    </span>
                                    {source.syncEnabled && (
                                        <span className="text-xs text-muted-foreground">
                                            • Sync every {source.syncIntervalMinutes}m
                                        </span>
                                    )}
                                    {source.syncError && (
                                        <span
                                            className="text-xs text-red-500 truncate"
                                            title={source.syncError}
                                        >
                                            • {source.syncError}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {editSourceId === source.id ? (
                                <div className="flex items-center gap-2 bg-accent p-2 rounded-lg">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={source.syncEnabled}
                                            onChange={(e) => {
                                                onUpdate(
                                                    source.id,
                                                    e.target.checked,
                                                    source.syncIntervalMinutes
                                                );
                                            }}
                                            className="rounded border-border"
                                        />
                                        <span>Sync</span>
                                    </label>
                                    <select
                                        value={source.syncIntervalMinutes}
                                        onChange={(e) => {
                                            onUpdate(
                                                source.id,
                                                source.syncEnabled,
                                                parseInt(e.target.value)
                                            );
                                        }}
                                        disabled={!source.syncEnabled}
                                        className="text-sm border border-border rounded px-2 py-1 bg-background disabled:opacity-50"
                                    >
                                        <option value={15}>15m</option>
                                        <option value={30}>30m</option>
                                        <option value={60}>1h</option>
                                        <option value={360}>6h</option>
                                        <option value={1440}>24h</option>
                                    </select>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditSourceId(null)}
                                    >
                                        Done
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditSourceId(source.id)}
                                        title="Edit sync settings"
                                    >
                                        <Settings2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onSync(source.id)}
                                        disabled={
                                            isSyncing.has(source.id) ||
                                            source.syncStatus === "syncing"
                                        }
                                        title="Sync now"
                                    >
                                        <RefreshCw
                                            className={`w-4 h-4 ${
                                                isSyncing.has(source.id) ||
                                                source.syncStatus === "syncing"
                                                    ? "animate-spin"
                                                    : ""
                                            }`}
                                        />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeleteSourceId(source.id)}
                                        title="Delete source"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <ConfirmDialog
                isOpen={!!deleteSourceId}
                onClose={() => setDeleteSourceId(null)}
                onConfirm={handleDelete}
                title="Delete Integration Source"
                message="Are you sure you want to delete this integration source? Documents already imported will remain, but sync will be disabled."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
