import { Send } from "lucide-react";
import { memo } from "react";
import { BaseNode } from "../BaseNode";
import type { NodeStatus } from "../BaseNode";
import type { NodeProps } from "reactflow";

interface OutputNodeData {
    label?: string;
    status?: NodeStatus;
    format?: "json" | "text" | "file";
    template?: string;
    fields?: string[];
    outputVariable?: string;
    description?: string;
}

function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
    const format = data.format || "json";
    const template = data.template || "";
    const fields = data.fields || [];
    const outputName = data.outputVariable || "output";

    const preview =
        format === "text"
            ? template.substring(0, 60) + (template.length > 60 ? "..." : "")
            : format === "json"
              ? fields.length > 0
                  ? `{ ${fields.join(", ")} }`
                  : "{ full context }"
              : "[file output]";

    return (
        <BaseNode
            icon={Send}
            label={data.label || "Output"}
            status={data.status}
            category="tools"
            subcategory="flow-control"
            selected={selected}
            hasOutputHandle={false}
        >
            <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Output Variable:</span>
                    <span className="font-mono">{outputName}</span>
                </div>

                <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium uppercase">{format}</span>
                </div>

                {format === "json" && (
                    <div className="pt-1 border-t border-border">
                        <span className="text-muted-foreground">
                            {fields.length > 0 ? `Fields: ${fields.join(", ")}` : "Full context"}
                        </span>
                    </div>
                )}

                {format === "text" && (
                    <div className="pt-1 border-t border-border line-clamp-2 italic text-muted-foreground">
                        {preview}
                    </div>
                )}

                {format === "file" && (
                    <div className="pt-1 border-t border-border text-muted-foreground italic">
                        File output (not yet generated)
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(OutputNode);
