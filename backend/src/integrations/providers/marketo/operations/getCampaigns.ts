import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Get Campaigns Parameters
 */
export const getCampaignsSchema = z.object({
    isTriggerable: z
        .boolean()
        .optional()
        .describe("If true, only return smart campaigns that can be triggered via API"),
    nextPageToken: z.string().optional().describe("Token for pagination to get the next page")
});

export type GetCampaignsParams = z.infer<typeof getCampaignsSchema>;

/**
 * Operation Definition
 */
export const getCampaignsOperation: OperationDefinition = {
    id: "getCampaigns",
    name: "Get Campaigns",
    description: "Get all campaigns from Marketo. Optionally filter to only triggerable campaigns.",
    category: "campaigns",
    inputSchema: getCampaignsSchema,
    inputSchemaJSON: toJSONSchema(getCampaignsSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Get Campaigns
 */
export async function executeGetCampaigns(
    client: MarketoClient,
    params: GetCampaignsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCampaigns(params.isTriggerable, params.nextPageToken);

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to get campaigns from Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: {
                campaigns: response.result || [],
                nextPageToken: response.nextPageToken,
                hasMore: !!response.nextPageToken
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get campaigns",
                retryable: false
            }
        };
    }
}
