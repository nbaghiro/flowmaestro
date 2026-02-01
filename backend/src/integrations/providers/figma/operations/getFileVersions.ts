import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { FigmaClient } from "../client/FigmaClient";

export const getFileVersionsOperation: OperationDefinition = {
    id: "getFileVersions",
    name: "Get File Versions",
    description: "Retrieve version history for a Figma file",
    category: "files",
    inputSchema: z.object({
        fileKey: z.string().describe("Figma file key from URL")
    }),
    retryable: true
};

export async function executeGetFileVersions(
    client: FigmaClient,
    params: z.infer<typeof getFileVersionsOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getFileVersions(params.fileKey);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get file versions",
                retryable: true
            }
        };
    }
}
