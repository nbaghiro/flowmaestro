import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeInvoice, ChargebeeListResponse } from "../types";

/**
 * List Invoices operation schema
 */
export const listInvoicesSchema = z.object({
    limit: z.number().min(1).max(100).optional().default(25),
    offset: z.string().optional(),
    customer_id: z.string().optional(),
    subscription_id: z.string().optional(),
    status: z.enum(["paid", "posted", "payment_due", "not_paid", "voided", "pending"]).optional()
});

export type ListInvoicesParams = z.infer<typeof listInvoicesSchema>;

/**
 * List Invoices operation definition
 */
export const listInvoicesOperation: OperationDefinition = {
    id: "listInvoices",
    name: "List Invoices",
    description: "List all invoices in Chargebee with pagination and optional filters",
    category: "invoices",
    inputSchema: listInvoicesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list invoices operation
 */
export async function executeListInvoices(
    client: ChargebeeClient,
    params: ListInvoicesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, string> = {
            limit: String(params.limit)
        };

        if (params.offset) {
            queryParams.offset = params.offset;
        }
        if (params.customer_id) {
            queryParams["customer_id[is]"] = params.customer_id;
        }
        if (params.subscription_id) {
            queryParams["subscription_id[is]"] = params.subscription_id;
        }
        if (params.status) {
            queryParams["status[is]"] = params.status;
        }

        const queryString = new URLSearchParams(queryParams).toString();
        const response = await client.get<ChargebeeListResponse<ChargebeeInvoice>>(
            `/invoices?${queryString}`
        );

        const invoices = response.list.map((item) => item.invoice).filter(Boolean);

        return {
            success: true,
            data: {
                invoices,
                count: invoices.length,
                next_offset: response.next_offset
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list invoices",
                retryable: true
            }
        };
    }
}
