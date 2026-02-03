import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const exportDesignOperation: OperationDefinition = {
    id: "exportDesign",
    name: "Export Design",
    description: "Export a Canva design in a specific format (PDF, JPG, or PNG)",
    category: "designs",
    inputSchema: z.object({
        designId: z.string().describe("The ID of the design to export"),
        format: z.enum(["pdf", "jpg", "png"]).describe("Export format")
    }),
    retryable: false
};

export async function executeExportDesign(
    client: CanvaClient,
    params: z.infer<typeof exportDesignOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.exportDesign(params.designId, params.format);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to export Canva design",
                retryable: false
            }
        };
    }
}
