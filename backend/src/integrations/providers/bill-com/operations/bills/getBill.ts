import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComBill, BillComApiResponse } from "../types";

/**
 * Get Bill operation schema
 */
export const getBillSchema = z.object({
    id: z.string().describe("Bill ID")
});

export type GetBillParams = z.infer<typeof getBillSchema>;

/**
 * Get Bill operation definition
 */
export const getBillOperation: OperationDefinition = {
    id: "getBill",
    name: "Get Bill",
    description: "Get a specific bill by ID",
    category: "bills",
    inputSchema: getBillSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get bill operation
 */
export async function executeGetBill(
    client: BillComClient,
    params: GetBillParams
): Promise<OperationResult> {
    try {
        const response = await client.post<BillComApiResponse<BillComBill>>(
            "/Crud/Read/Bill.json",
            {
                id: params.id
            }
        );

        if (!response.response_data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Bill not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.response_data
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get bill";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Bill not found",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
