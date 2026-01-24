/**
 * PDF Generation Node Component
 *
 * Generates PDF documents from markdown or HTML content.
 * Uses the pdf_generate builtin tool.
 */

import { FileOutput } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface PdfGenerationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    format?: string;
    pageSize?: string;
    orientation?: string;
    filename?: string;
}

function PdfGenerationNode({ data, selected }: NodeProps<PdfGenerationNodeData>) {
    const format = data.format || "markdown";
    const pageSize = data.pageSize || "a4";
    const orientation = data.orientation || "portrait";

    return (
        <BaseNode
            icon={FileOutput}
            label={data.label || "PDF"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <span className="text-xs font-medium text-foreground capitalize">{format}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Size:</span>
                    <span className="text-xs font-medium text-foreground uppercase">
                        {pageSize}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Orientation:</span>
                    <span className="text-xs font-medium text-foreground capitalize">
                        {orientation}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(PdfGenerationNode);
