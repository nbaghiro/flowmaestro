import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const uploadAssetOperation: OperationDefinition = {
    id: "uploadAsset",
    name: "Upload Asset",
    description: "Upload a new asset (image, video, etc.) to Canva",
    category: "assets",
    inputSchema: z.object({
        name: z.string().min(1).describe("Name for the uploaded asset"),
        dataUrl: z.string().describe("Data URL of the asset to upload")
    }),
    retryable: false
};

export async function executeUploadAsset(
    client: CanvaClient,
    params: z.infer<typeof uploadAssetOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.uploadAsset({
            name: params.name,
            data_url: params.dataUrl
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
                message: error instanceof Error ? error.message : "Failed to upload Canva asset",
                retryable: false
            }
        };
    }
}
