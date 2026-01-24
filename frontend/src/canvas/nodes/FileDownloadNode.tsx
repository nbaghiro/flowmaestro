/**
 * File Download Node Component
 *
 * Downloads files from URLs.
 * Uses the file_download builtin tool.
 */

import { FileDown } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface FileDownloadNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    url?: string;
    filename?: string;
    maxSize?: number;
    timeout?: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FileDownloadNode({ data, selected }: NodeProps<FileDownloadNodeData>) {
    const maxSize = data.maxSize || 52428800; // 50MB default
    const timeout = data.timeout || 60000;

    return (
        <BaseNode
            icon={FileDown}
            label={data.label || "File Download"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max Size:</span>
                    <span className="text-xs font-medium text-foreground">
                        {formatBytes(maxSize)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Timeout:</span>
                    <span className="text-xs font-medium text-foreground">
                        {Math.round(timeout / 1000)}s
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(FileDownloadNode);
