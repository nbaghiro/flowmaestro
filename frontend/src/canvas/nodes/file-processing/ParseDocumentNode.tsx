import { FileSearch } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "../BaseNode";

type SupportedFileType = "docx" | "doc" | "text" | "rtf" | "odt" | "html" | "md";

interface ParseDocumentNodeData {
    label?: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    fileInput?: string;
    urlInput?: string;
    base64Input?: string;
    fileType?: SupportedFileType;
    preserveFormatting?: boolean;
    extractImages?: boolean;
    outputVariable?: string;
}

function ParseDocumentNode({ data, selected }: NodeProps<ParseDocumentNodeData>) {
    const source =
        data.fileInput || data.urlInput || data.base64Input || data.outputVariable || "Not set";
    const fileType = data.fileType ? data.fileType.toUpperCase() : "Auto";
    const output = data.outputVariable || "documentResult";

    return (
        <BaseNode
            icon={FileSearch}
            label={data.label || "Parse Document"}
            status={data.status}
            category="tools"
            subcategory="file-processing"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Source</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border max-w-[150px] truncate">
                        {source}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <span className="text-xs font-medium">{fileType}</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Formatting</span>
                    <span className="text-xs font-medium">
                        {data.preserveFormatting ? "Preserve" : "Plain text"}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Images</span>
                    <span className="text-xs font-medium">
                        {data.extractImages ? "Extract" : "Skip"}
                    </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Output</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border">
                        ${output}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(ParseDocumentNode);
