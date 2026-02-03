import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const getDesignOperation: OperationDefinition = {
    id: "getDesign",
    name: "Get Design",
    description: "Retrieve details of a specific Canva design by its ID",
    category: "designs",
    inputSchema: z.object({
        designId: z.string().describe("The ID of the Canva design to retrieve")
    }),
    retryable: true
};

export async function executeGetDesign(
    client: CanvaClient,
    params: z.infer<typeof getDesignOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const result = await client.getDesign(params.designId);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Canva design",
                retryable: true
            }
        };
    }
}
