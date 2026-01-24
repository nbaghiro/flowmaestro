/**
 * Web Search Node Component
 *
 * Searches the web using Tavily API.
 * Uses the web_search builtin tool.
 */

import { Search } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface WebSearchNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    query?: string;
    maxResults?: number;
    searchType?: string;
}

const SEARCH_TYPE_LABELS: Record<string, string> = {
    general: "General",
    news: "News",
    images: "Images"
};

function WebSearchNode({ data, selected }: NodeProps<WebSearchNodeData>) {
    const maxResults = data.maxResults || 5;
    const searchType = data.searchType || "general";

    return (
        <BaseNode
            icon={Search}
            label={data.label || "Web Search"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium text-foreground">
                        {SEARCH_TYPE_LABELS[searchType] || searchType}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Max Results:</span>
                    <span className="text-xs font-medium text-foreground">{maxResults}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(WebSearchNode);
