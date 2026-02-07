import { z } from "zod";
import { RampClient } from "../../client/RampClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { RampReimbursement, RampListResponse } from "../types";

/**
 * List Reimbursements operation schema
 */
export const listReimbursementsSchema = z.object({
    start: z.string().optional().describe("Start cursor for pagination"),
    page_size: z.number().min(1).max(100).optional().default(25),
    from_date: z.string().optional().describe("Filter from date (ISO 8601)"),
    to_date: z.string().optional().describe("Filter to date (ISO 8601)")
});

export type ListReimbursementsParams = z.infer<typeof listReimbursementsSchema>;

/**
 * List Reimbursements operation definition
 */
export const listReimbursementsOperation: OperationDefinition = {
    id: "listReimbursements",
    name: "List Reimbursements",
    description: "List all reimbursement requests with pagination",
    category: "reimbursements",
    inputSchema: listReimbursementsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list reimbursements operation
 */
export async function executeListReimbursements(
    client: RampClient,
    params: ListReimbursementsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            page_size: String(params.page_size)
        };

        if (params.start) queryParams.start = params.start;
        if (params.from_date) queryParams.from_date = params.from_date;
        if (params.to_date) queryParams.to_date = params.to_date;

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<RampListResponse<RampReimbursement>>(
            `/reimbursements?${queryString}`
        );

        return {
            success: true,
            data: {
                reimbursements: response.data,
                count: response.data.length,
                next_cursor: response.page?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list reimbursements",
                retryable: true
            }
        };
    }
}
