/**
 * File Read Node Component
 *
 * Reads files from the execution workspace.
 * Uses the file_read builtin tool.
 */

import { FileInput } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface FileReadNodeData {
    label: string;
    status?: NodeExecutionStatus;
    path?: string;
    encoding?: string;
    maxSize?: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function FileReadNode({ data, selected }: NodeProps<FileReadNodeData>) {
    const encoding = data.encoding || "utf-8";
    const maxSize = data.maxSize || 1000000; // 1MB default

    return (
        <BaseNode
            icon={FileInput}
            label={data.label || "File Read"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Encoding:</span>
                    <span className="text-xs font-medium text-foreground uppercase">
                        {encoding}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max Size:</span>
                    <span className="text-xs font-medium text-foreground">
                        {formatBytes(maxSize)}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(FileReadNode);
