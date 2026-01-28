/**
 * Web Browse Node Component
 *
 * Fetches and extracts content from web pages.
 * Uses the web_browse builtin tool.
 */

import { ExternalLink } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface WebBrowseNodeData {
    label: string;
    status?: NodeExecutionStatus;
    url?: string;
    extractText?: boolean;
    maxLength?: number;
}

function WebBrowseNode({ data, selected }: NodeProps<WebBrowseNodeData>) {
    const extractText = data.extractText ?? true;
    const maxLength = data.maxLength || 10000;

    return (
        <BaseNode
            icon={ExternalLink}
            label={data.label || "Web Browse"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Extract Text:</span>
                    <span className="text-xs font-medium text-foreground">
                        {extractText ? "Yes" : "No"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max Length:</span>
                    <span className="text-xs font-medium text-foreground">
                        {maxLength.toLocaleString()}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(WebBrowseNode);
