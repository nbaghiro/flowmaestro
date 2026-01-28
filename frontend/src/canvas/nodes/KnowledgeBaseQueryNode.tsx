import { BookOpen } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface KnowledgeBaseQueryNodeData {
    label: string;
    status?: NodeExecutionStatus;
    knowledgeBaseId?: string;
    knowledgeBaseName?: string;
    queryText?: string;
}

function KnowledgeBaseQueryNode({ data, selected }: NodeProps<KnowledgeBaseQueryNodeData>) {
    const kbName = data.knowledgeBaseName || "No KB selected";
    const queryPreview = data.queryText
        ? data.queryText.substring(0, 30) + (data.queryText.length > 30 ? "..." : "")
        : "No query set";

    return (
        <BaseNode
            icon={BookOpen}
            label={data.label || "KB Query"}
            status={data.status}
            category="data"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Knowledge Base:</span>
                    <span className="text-xs font-medium truncate max-w-[120px]" title={kbName}>
                        {kbName}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Query:</span>
                    <span
                        className="text-xs font-medium truncate max-w-[120px]"
                        title={data.queryText}
                    >
                        {queryPreview}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(KnowledgeBaseQueryNode);
