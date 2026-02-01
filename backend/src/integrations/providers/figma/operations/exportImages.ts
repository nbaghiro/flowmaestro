import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FigmaClient } from "../client/FigmaClient";

export const exportImagesOperation: OperationDefinition = {
    id: "exportImages",
    name: "Export Images",
    description:
        "Export nodes as images in PNG, JPG, SVG, or PDF format. Note: URLs expire after 30 days.",
    category: "images",
    inputSchema: z.object({
        fileKey: z.string().describe("Figma file key from URL"),
        nodeIds: z.array(z.string()).min(1).describe("Node IDs to export (e.g., ['1:2', '1:3'])"),
        format: z
            .enum(["png", "jpg", "svg", "pdf"])
            .optional()
            .default("png")
            .describe("Export format"),
        scale: z
            .number()
            .min(0.01)
            .max(4)
            .optional()
            .describe("Scale factor (0.01 to 4), default 1"),
        svgIncludeId: z.boolean().optional().describe("Include id attributes in SVG elements"),
        svgSimplifyStroke: z.boolean().optional().describe("Simplify strokes in SVG output"),
        useAbsoluteBounds: z.boolean().optional().describe("Use absolute bounding box for export")
    }),
    retryable: true
};

export async function executeExportImages(
    client: FigmaClient,
    params: z.infer<typeof exportImagesOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.exportImages(params.fileKey, params.nodeIds, {
            format: params.format,
            scale: params.scale,
            svg_include_id: params.svgIncludeId,
            svg_simplify_stroke: params.svgSimplifyStroke,
            use_absolute_bounds: params.useAbsoluteBounds
        });

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to export images",
                retryable: true
            }
        };
    }
}
