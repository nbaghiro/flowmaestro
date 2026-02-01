/**
 * Spreadsheet Generation Node Component
 *
 * Generates Excel/CSV files from data.
 * Uses the spreadsheet_generate builtin tool.
 */

import { FileSpreadsheet } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface SpreadsheetGenerationNodeData {
    label: string;
    status?: NodeExecutionStatus;
    format?: "xlsx" | "csv";
    filename?: string;
}

function SpreadsheetGenerationNode({ data, selected }: NodeProps<SpreadsheetGenerationNodeData>) {
    const format = data.format || "xlsx";
    const filename = data.filename || "spreadsheet";

    return (
        <BaseNode
            icon={FileSpreadsheet}
            label={data.label || "Spreadsheet"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <span className="text-xs font-medium text-foreground uppercase">{format}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">File:</span>
                    <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                        {filename}.{format}
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(SpreadsheetGenerationNode);
