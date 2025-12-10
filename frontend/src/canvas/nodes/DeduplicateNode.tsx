import { Copy } from "lucide-react";
import { memo } from "react";
import { BaseNode } from "./BaseNode";
import type { NodeProps } from "reactflow";

interface DeduplicateNodeData {
    label?: string;
    inputArray?: string;
    keyFields?: string[];
    keep?: "first" | "last";
    caseSensitive?: boolean;
    outputVariable?: string;
    duplicatesVariable?: string;
}

function DeduplicateNode({ data, selected }: NodeProps<DeduplicateNodeData>) {
    const label = data.label || "Deduplicate";

    const keep = data.keep || "first";
    const caseSensitive = data.caseSensitive ?? false;
    const keyFields = data.keyFields || [];

    const keyPreview =
        keyFields.length === 0
            ? "No keys"
            : keyFields.join(", ").slice(0, 80) + (keyFields.join(", ").length > 80 ? "…" : "");

    return (
        <BaseNode
            icon={Copy}
            label={label}
            category="tools"
            subcategory="data-processing"
            selected={selected}
        >
            <div className="flex flex-col text-xs gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Keep</span>
                    <span className="font-medium">{keep}</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Case Sensitive</span>
                    <span className="font-medium">{caseSensitive ? "Yes" : "No"}</span>
                </div>

                <div className="border border-border rounded bg-muted/40 px-2 py-1.5 max-h-24 overflow-auto">
                    <div className="text-[10px] text-muted-foreground mb-1">Key Fields</div>
                    <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
                        {keyPreview}
                    </pre>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(DeduplicateNode);
