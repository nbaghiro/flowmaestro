/**
 * File Write Node Component
 *
 * Writes files to the execution workspace.
 * Uses the file_write builtin tool.
 */

import { FilePenLine } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface FileWriteNodeData {
    label: string;
    status?: NodeExecutionStatus;
    path?: string;
    encoding?: string;
    createDirectories?: boolean;
    overwrite?: boolean;
}

function FileWriteNode({ data, selected }: NodeProps<FileWriteNodeData>) {
    const encoding = data.encoding || "utf-8";
    const overwrite = data.overwrite ?? true;

    return (
        <BaseNode
            icon={FilePenLine}
            label={data.label || "File Write"}
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
                    <span className="text-xs text-muted-foreground">Overwrite:</span>
                    <span className="text-xs font-medium text-foreground">
                        {overwrite ? "Yes" : "No"}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(FileWriteNode);
