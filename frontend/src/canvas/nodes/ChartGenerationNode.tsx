/**
 * Chart Generation Node Component
 *
 * Generates charts and visualizations from data.
 * Uses the chart_generate builtin tool.
 */

import { BarChart2 } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface ChartGenerationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    chartType?: string;
    theme?: string;
    filename?: string;
}

const CHART_TYPE_LABELS: Record<string, string> = {
    bar: "Bar",
    line: "Line",
    pie: "Pie",
    scatter: "Scatter",
    area: "Area",
    donut: "Donut",
    histogram: "Histogram",
    heatmap: "Heatmap",
    horizontal_bar: "Horizontal Bar"
};

function ChartGenerationNode({ data, selected }: NodeProps<ChartGenerationNodeData>) {
    const chartType = data.chartType || "bar";
    const theme = data.theme || "light";

    return (
        <BaseNode
            icon={BarChart2}
            label={data.label || "Chart"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium text-foreground">
                        {CHART_TYPE_LABELS[chartType] || chartType}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Theme:</span>
                    <span className="text-xs font-medium text-foreground capitalize">{theme}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(ChartGenerationNode);
