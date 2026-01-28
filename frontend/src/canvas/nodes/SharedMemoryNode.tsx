import { Database, Search } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface SharedMemoryNodeData {
    label: string;
    status?: NodeExecutionStatus;
    operation?: "store" | "search";
    key?: string;
    value?: string;
    searchQuery?: string;
    enableSemanticSearch?: boolean;
}

function SharedMemoryNode({ data, selected }: NodeProps<SharedMemoryNodeData>) {
    const operation = data.operation || "store";
    const key = data.key || "";
    const searchQuery = data.searchQuery || "";

    return (
        <BaseNode
            icon={operation === "search" ? Search : Database}
            label={data.label || "Shared Memory"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Operation:</span>
                    <span className="text-xs font-medium capitalize">{operation}</span>
                </div>

                {operation === "store" && (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Key:</span>
                            <span
                                className={`text-xs ${key ? "font-mono bg-muted px-1.5 py-0.5 rounded" : "text-muted-foreground"}`}
                            >
                                {key || "-"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Value:</span>
                            <span
                                className={`text-xs truncate max-w-[120px] ${data.value ? "font-medium" : "text-muted-foreground"}`}
                            >
                                {data.value || "-"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Searchable:</span>
                            <span className="text-xs font-medium">
                                {data.enableSemanticSearch ? "Yes" : "No"}
                            </span>
                        </div>
                    </>
                )}

                {operation === "search" && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Query:</span>
                        <span
                            className={`text-xs truncate max-w-[120px] ${searchQuery ? "font-medium" : "text-muted-foreground"}`}
                        >
                            {searchQuery || "-"}
                        </span>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(SharedMemoryNode);
