import { FileText, ScanLine } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "../BaseNode";

interface ParsePDFNodeData {
    label?: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    fileInput?: string;
    urlInput?: string;
    base64Input?: string;
    ocrEnabled?: boolean;
    ocrLanguage?: string;
    extractTables?: boolean;
    pageRange?: { start?: number; end?: number };
    outputVariable?: string;
}

function ParsePDFNode({ data, selected }: NodeProps<ParsePDFNodeData>) {
    const source =
        data.fileInput || data.urlInput || data.base64Input || data.outputVariable || "Not set";
    const pageRangeLabel =
        data.pageRange && (data.pageRange.start || data.pageRange.end)
            ? `${data.pageRange.start || 1} - ${data.pageRange.end || "end"}`
            : "All pages";
    const output = data.outputVariable || "pdfResult";

    return (
        <BaseNode
            icon={FileText}
            label={data.label || "Parse PDF"}
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
                    <span className="text-xs text-muted-foreground">OCR</span>
                    <span className="text-xs font-medium flex items-center gap-1">
                        {data.ocrEnabled ? (
                            <>
                                <ScanLine className="w-3 h-3" />
                                {data.ocrLanguage || "eng"}
                            </>
                        ) : (
                            "Off"
                        )}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pages</span>
                    <span className="text-xs font-medium">{pageRangeLabel}</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tables</span>
                    <span className="text-xs font-medium">{data.extractTables ? "On" : "Off"}</span>
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

export default memo(ParsePDFNode);
