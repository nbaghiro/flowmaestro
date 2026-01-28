/**
 * URL Node Component
 *
 * A dedicated node for URL inputs at workflow start.
 * Only has an output handle (no inbound connections) since it's always a start node.
 */

import { Link } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface URLNodeData {
    label: string;
    status?: NodeExecutionStatus;
    urls?: string[];
}

function URLNode({ data, selected }: NodeProps<URLNodeData>) {
    const urls = data.urls || [];

    // Format URLs display
    const getURLsDisplay = () => {
        if (urls.length === 0) {
            return "-";
        }
        return `${urls.length} URL${urls.length > 1 ? "s" : ""}`;
    };

    return (
        <BaseNode
            icon={Link}
            label={data.label || "URL"}
            status={data.status}
            category="inputs"
            selected={selected}
            hasInputHandle={false}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium text-foreground">URL</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">URLs:</span>
                    <span className="text-xs font-medium text-foreground">{getURLsDisplay()}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(URLNode);
