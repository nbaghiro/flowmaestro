import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquareRefundsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Refunds operation schema
 */
export const listRefundsSchema = z.object({
    location_id: z.string().optional().describe("Filter by location"),
    begin_time: z.string().optional().describe("Start time (RFC 3339)"),
    end_time: z.string().optional().describe("End time (RFC 3339)"),
    sort_order: z.enum(["ASC", "DESC"]).optional().default("DESC"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListRefundsParams = z.infer<typeof listRefundsSchema>;

/**
 * List Refunds operation definition
 */
export const listRefundsOperation: OperationDefinition = {
    id: "listRefunds",
    name: "List Refunds",
    description: "List all refunds with optional filters",
    category: "refunds",
    actionType: "read",
    inputSchema: listRefundsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list refunds operation
 */
export async function executeListRefunds(
    client: SquareClient,
    params: ListRefundsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            limit: params.limit
        };

        if (params.location_id) {
            queryParams.location_id = params.location_id;
        }

        if (params.begin_time) {
            queryParams.begin_time = params.begin_time;
        }

        if (params.end_time) {
            queryParams.end_time = params.end_time;
        }

        if (params.sort_order) {
            queryParams.sort_order = params.sort_order;
        }

        const response = await client.get<SquareRefundsResponse>("/refunds", queryParams);

        if (response.errors && response.errors.length > 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: response.errors[0].detail || response.errors[0].code,
                    retryable: false
                }
            };
        }

        const refunds = (response.refunds || []).map((refund) => ({
            id: refund.id,
            paymentId: refund.payment_id,
            amountMoney: refund.amount_money,
            status: refund.status,
            locationId: refund.location_id,
            reason: refund.reason,
            createdAt: refund.created_at
        }));

        return {
            success: true,
            data: {
                refunds,
                cursor: response.cursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list refunds",
                retryable: true
            }
        };
    }
}
