import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComBill, BillComListResponse } from "../types";

/**
 * List Bills operation schema
 */
export const listBillsSchema = z.object({
    start: z.number().min(0).optional().default(0),
    max: z.number().min(1).max(999).optional().default(100),
    vendorId: z.string().optional(),
    paymentStatus: z.enum(["0", "1", "2", "3", "4"]).optional()
});

export type ListBillsParams = z.infer<typeof listBillsSchema>;

/**
 * List Bills operation definition
 */
export const listBillsOperation: OperationDefinition = {
    id: "listBills",
    name: "List Bills",
    description: "List all bills/invoices with pagination and filters",
    category: "bills",
    inputSchema: listBillsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list bills operation
 */
export async function executeListBills(
    client: BillComClient,
    params: ListBillsParams
): Promise<OperationResult> {
    try {
        const filters: Array<{ field: string; op: string; value: string }> = [];

        if (params.vendorId) {
            filters.push({ field: "vendorId", op: "=", value: params.vendorId });
        }
        if (params.paymentStatus) {
            filters.push({ field: "paymentStatus", op: "=", value: params.paymentStatus });
        }

        const response = await client.post<BillComListResponse<BillComBill>>("/List/Bill.json", {
            start: params.start,
            max: params.max,
            filters
        });

        const bills = response.response_data || [];

        return {
            success: true,
            data: {
                bills,
                count: bills.length,
                start: params.start,
                max: params.max
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list bills",
                retryable: true
            }
        };
    }
}
