import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedriveDeal } from "../types";

/**
 * Create Deal Parameters
 */
export const createDealSchema = z.object({
    title: z.string().min(1).describe("Deal title (required)"),
    value: z.number().optional().describe("Deal value"),
    currency: z.string().length(3).optional().describe("Currency code (e.g., USD, EUR)"),
    person_id: z.number().int().optional().describe("ID of the person to link"),
    org_id: z.number().int().optional().describe("ID of the organization to link"),
    stage_id: z.number().int().optional().describe("ID of the pipeline stage"),
    status: z.enum(["open", "won", "lost"]).optional().describe("Deal status"),
    expected_close_date: z.string().optional().describe("Expected close date (YYYY-MM-DD)"),
    probability: z.number().min(0).max(100).optional().describe("Deal probability (0-100)"),
    lost_reason: z.string().optional().describe("Reason for lost deal (only if status is lost)"),
    visible_to: z
        .enum(["1", "3", "5", "7"])
        .optional()
        .describe("Visibility: 1=owner, 3=owner+followers, 5=company, 7=owner+followers+company"),
    user_id: z.number().int().optional().describe("Owner user ID")
});

export type CreateDealParams = z.infer<typeof createDealSchema>;

/**
 * Operation Definition
 */
export const createDealOperation: OperationDefinition = {
    id: "createDeal",
    name: "Create Deal",
    description: "Create a new deal in the sales pipeline",
    category: "deals",
    inputSchema: createDealSchema,
    inputSchemaJSON: toJSONSchema(createDealSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Deal
 */
export async function executeCreateDeal(
    client: PipedriveClient,
    params: CreateDealParams
): Promise<OperationResult> {
    try {
        const response = await client.post<PipedriveResponse<PipedriveDeal>>("/deals", params);

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create deal",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create deal",
                retryable: false
            }
        };
    }
}
