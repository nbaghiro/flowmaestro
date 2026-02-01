import { Repeat } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface LoopNodeData {
    label: string;
    status?: NodeExecutionStatus;
    loopType?: "forEach" | "while" | "times";
    arrayVariable?: string;
    itemVariable?: string;
    indexVariable?: string;
    condition?: string;
    count?: number;
    maxIterations?: number;
}

function LoopNode({ data, selected }: NodeProps<LoopNodeData>) {
    const loopType = data.loopType || "forEach";
    const arrayVariable = data.arrayVariable || "${items}";
    const itemVariable = data.itemVariable || "item";
    const indexVariable = data.indexVariable || "index";
    const condition = data.condition || "";
    const count = data.count || 10;

    const renderLoopDetails = () => {
        switch (loopType) {
            case "forEach":
                return (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Array:</span>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded truncate max-w-[140px]">
                                {arrayVariable}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Item:</span>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                ${itemVariable}
                            </span>
                        </div>
                    </>
                );
            case "while":
                return (
                    <>
                        <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                While:
                            </span>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded line-clamp-2 flex-1">
                                {condition || "No condition set"}
                            </span>
                        </div>
                    </>
                );
            case "times":
                return (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Iterations:</span>
                            <span className="text-xs font-medium">{count}x</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Index:</span>
                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                ${indexVariable}
                            </span>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    const getLoopTypeLabel = () => {
        switch (loopType) {
            case "forEach":
                return "For Each";
            case "while":
                return "While";
            case "times":
                return "Times";
            default:
                return "Loop";
        }
    };

    return (
        <BaseNode
            icon={Repeat}
            label={data.label || "Loop"}
            status={data.status}
            category="logic"
            selected={selected}
        >
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-semibold">{getLoopTypeLabel()}</span>
                </div>
                <div className="flex-1 overflow-auto pt-2 space-y-2">{renderLoopDetails()}</div>
            </div>
        </BaseNode>
    );
}

export default memo(LoopNode);
