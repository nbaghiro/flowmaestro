import { z } from "zod";
import { SquareClient } from "../client/SquareClient";
import type { SquarePaymentsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Payments operation schema
 */
export const listPaymentsSchema = z.object({
    location_id: z.string().optional().describe("Filter by location"),
    begin_time: z.string().optional().describe("Start time (RFC 3339)"),
    end_time: z.string().optional().describe("End time (RFC 3339)"),
    sort_order: z.enum(["ASC", "DESC"]).optional().default("DESC"),
    limit: z.number().int().min(1).max(100).optional().default(10).describe("Number of results")
});

export type ListPaymentsParams = z.infer<typeof listPaymentsSchema>;

/**
 * List Payments operation definition
 */
export const listPaymentsOperation: OperationDefinition = {
    id: "listPayments",
    name: "List Payments",
    description: "List all payments with optional filters",
    category: "payments",
    actionType: "read",
    inputSchema: listPaymentsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list payments operation
 */
export async function executeListPayments(
    client: SquareClient,
    params: ListPaymentsParams
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

        const response = await client.get<SquarePaymentsResponse>("/payments", queryParams);

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

        const payments = (response.payments || []).map((payment) => ({
            id: payment.id,
            amountMoney: payment.amount_money,
            status: payment.status,
            sourceType: payment.source_type,
            locationId: payment.location_id,
            customerId: payment.customer_id,
            createdAt: payment.created_at
        }));

        return {
            success: true,
            data: {
                payments,
                cursor: response.cursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list payments",
                retryable: true
            }
        };
    }
}
