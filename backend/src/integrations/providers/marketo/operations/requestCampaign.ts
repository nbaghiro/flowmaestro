import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MarketoClient } from "../client/MarketoClient";

/**
 * Request Campaign Parameters
 */
export const requestCampaignSchema = z.object({
    campaignId: z.number().describe("The ID of the smart campaign to trigger"),
    leadIds: z
        .array(z.number())
        .min(1)
        .max(100)
        .describe("Lead IDs to add to the campaign (max 100)"),
    tokens: z
        .array(
            z.object({
                name: z.string().describe("Token name (e.g., '{{my.Custom Token}}')"),
                value: z.string().describe("Token value")
            })
        )
        .optional()
        .describe("My Tokens to pass to the campaign for personalization")
});

export type RequestCampaignParams = z.infer<typeof requestCampaignSchema>;

/**
 * Operation Definition
 */
export const requestCampaignOperation: OperationDefinition = {
    id: "requestCampaign",
    name: "Request Campaign",
    description:
        "Trigger a smart campaign for specific leads. The campaign must have a 'Campaign is Requested' trigger.",
    category: "campaigns",
    actionType: "write",
    inputSchema: requestCampaignSchema,
    inputSchemaJSON: toJSONSchema(requestCampaignSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Request Campaign
 */
export async function executeRequestCampaign(
    client: MarketoClient,
    params: RequestCampaignParams
): Promise<OperationResult> {
    try {
        const input = params.leadIds.map((id) => ({ id }));
        const response = await client.requestCampaign(params.campaignId, input, params.tokens);

        if (!response.success) {
            const errorMessage =
                response.errors?.[0]?.message || "Failed to trigger campaign in Marketo";
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: errorMessage,
                    retryable: false
                }
            };
        }

        // Count results
        const results = response.result || [];
        const scheduled = results.filter((r) => r.status === "scheduled").length;
        const skipped = results.filter((r) => r.status === "skipped").length;

        return {
            success: true,
            data: {
                campaignId: params.campaignId,
                results,
                summary: {
                    total: params.leadIds.length,
                    scheduled,
                    skipped
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to trigger campaign",
                retryable: false
            }
        };
    }
}
