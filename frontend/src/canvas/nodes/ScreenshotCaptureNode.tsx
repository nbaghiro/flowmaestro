/**
 * Screenshot Capture Node Component
 *
 * Captures screenshots of web pages.
 * Uses the screenshot_capture builtin tool.
 */

import { Camera } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import type { NodeExecutionStatus } from "@flowmaestro/shared";
import { BaseNode } from "./BaseNode";

interface ScreenshotCaptureNodeData {
    label: string;
    status?: NodeExecutionStatus;
    url?: string;
    width?: number;
    height?: number;
    fullPage?: boolean;
    format?: string;
}

function ScreenshotCaptureNode({ data, selected }: NodeProps<ScreenshotCaptureNodeData>) {
    const width = data.width || 1280;
    const height = data.height || 720;
    const format = data.format || "png";

    return (
        <BaseNode
            icon={Camera}
            label={data.label || "Screenshot"}
            status={data.status}
            category="utils"
            selected={selected}
        >
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Size:</span>
                    <span className="text-xs font-medium text-foreground">
                        {width}x{height}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <span className="text-xs font-medium text-foreground uppercase">{format}</span>
                </div>
                {data.fullPage && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Mode:</span>
                        <span className="text-xs font-medium text-foreground">Full Page</span>
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(ScreenshotCaptureNode);
