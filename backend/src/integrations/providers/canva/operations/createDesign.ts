import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { CanvaClient } from "../client/CanvaClient";

export const createDesignOperation: OperationDefinition = {
    id: "createDesign",
    name: "Create Design",
    description: "Create a new design in Canva with a given title and optional type",
    category: "designs",
    inputSchema: z.object({
        title: z.string().min(1).describe("Title for the new design"),
        designType: z
            .string()
            .optional()
            .describe("Type of design to create (e.g., 'Presentation')"),
        assetId: z.string().optional().describe("Asset ID to use as design starting point")
    }),
    retryable: false
};

export async function executeCreateDesign(
    client: CanvaClient,
    params: z.infer<typeof createDesignOperation.inputSchema>
): Promise<OperationResult> {
    try {
        const createParams: {
            title: string;
            design_type?: { type: string };
            asset_id?: string;
        } = {
            title: params.title
        };

        if (params.designType) {
            createParams.design_type = { type: params.designType };
        }

        if (params.assetId) {
            createParams.asset_id = params.assetId;
        }

        const result = await client.createDesign(createParams);

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Canva design",
                retryable: false
            }
        };
    }
}
