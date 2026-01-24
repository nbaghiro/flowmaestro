/**
 * PDF Extract Node Component
 *
 * Extracts text and metadata from PDF documents.
 * Uses the pdf_extract builtin tool.
 */

import { FileSearch } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface PdfExtractNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    path?: string;
    extractText?: boolean;
    extractMetadata?: boolean;
    outputFormat?: string;
}

function PdfExtractNode({ data, selected }: NodeProps<PdfExtractNodeData>) {
    const extractText = data.extractText ?? true;
    const extractMetadata = data.extractMetadata ?? true;
    const outputFormat = data.outputFormat || "text";

    return (
        <BaseNode
            icon={FileSearch}
            label={data.label || "PDF Extract"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <span className="text-xs font-medium text-foreground capitalize">
                        {outputFormat}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Text:</span>
                    <span className="text-xs font-medium text-foreground">
                        {extractText ? "Yes" : "No"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Metadata:</span>
                    <span className="text-xs font-medium text-foreground">
                        {extractMetadata ? "Yes" : "No"}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(PdfExtractNode);
