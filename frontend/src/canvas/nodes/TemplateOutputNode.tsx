import { FileText, FileCode } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface TemplateOutputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    template?: string;
    outputFormat?: "markdown" | "html";
}

function TemplateOutputNode({ data, selected }: NodeProps<TemplateOutputNodeData>) {
    const template = data.template || "No template defined";
    const format = data.outputFormat || "markdown";
    const templatePreview = template.substring(0, 60) + (template.length > 60 ? "..." : "");

    return (
        <BaseNode
            icon={format === "html" ? FileCode : FileText}
            label={data.label || "Template Output"}
            status={data.status}
            category="outputs"
            selected={selected}
            hasOutputHandle={false}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <div className="flex items-center gap-1">
                        {format === "html" ? (
                            <FileCode className="w-3 h-3 text-muted-foreground" />
                        ) : (
                            <FileText className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium uppercase text-foreground">
                            {format}
                        </span>
                    </div>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-border">
                    <div className="text-xs text-muted-foreground italic line-clamp-2">
                        {templatePreview}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(TemplateOutputNode);
