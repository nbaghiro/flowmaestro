/**
 * Files Node Component
 *
 * A dedicated node for file uploads at workflow start.
 * Only has an output handle (no inbound connections) since it's always a start node.
 */

import { FileText } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface UploadedFile {
    name: string;
    type: string;
}

interface FilesNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    uploadedFiles?: UploadedFile[];
}

function FilesNode({ data, selected }: NodeProps<FilesNodeData>) {
    const uploadedFiles = data.uploadedFiles || [];

    // Format uploaded files display
    const getUploadedFilesDisplay = () => {
        if (uploadedFiles.length === 0) {
            return "-";
        }
        // Group files by type and count
        const typeCounts: Record<string, number> = {};
        for (const file of uploadedFiles) {
            const ext = file.type.toUpperCase();
            typeCounts[ext] = (typeCounts[ext] || 0) + 1;
        }
        // Format as "2 PDF, 1 DOCX" etc.
        return Object.entries(typeCounts)
            .map(([type, count]) => `${count} ${type}`)
            .join(", ");
    };

    return (
        <BaseNode
            icon={FileText}
            label={data.label || "Files"}
            status={data.status}
            category="inputs"
            selected={selected}
            hasInputHandle={false}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium text-foreground">File</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Uploaded files:</span>
                    <span className="text-xs font-medium text-foreground">
                        {getUploadedFilesDisplay()}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(FilesNode);
