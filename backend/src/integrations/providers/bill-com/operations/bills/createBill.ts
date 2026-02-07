import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComBill, BillComApiResponse } from "../types";

/**
 * Create Bill operation schema
 */
export const createBillSchema = z.object({
    vendorId: z.string().describe("Vendor ID"),
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().describe("Invoice date (YYYY-MM-DD)"),
    dueDate: z.string().describe("Due date (YYYY-MM-DD)"),
    description: z.string().optional(),
    poNumber: z.string().optional(),
    billLineItems: z
        .array(
            z.object({
                amount: z.string().describe("Line item amount"),
                chartOfAccountId: z.string().optional(),
                departmentId: z.string().optional(),
                description: z.string().optional()
            })
        )
        .min(1)
        .describe("At least one line item is required")
});

export type CreateBillParams = z.infer<typeof createBillSchema>;

/**
 * Create Bill operation definition
 */
export const createBillOperation: OperationDefinition = {
    id: "createBill",
    name: "Create Bill",
    description: "Create a new bill/invoice",
    category: "bills",
    inputSchema: createBillSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create bill operation
 */
export async function executeCreateBill(
    client: BillComClient,
    params: CreateBillParams
): Promise<OperationResult> {
    try {
        const response = await client.post<BillComApiResponse<BillComBill>>(
            "/Crud/Create/Bill.json",
            {
                obj: {
                    entity: "Bill",
                    isActive: "1",
                    vendorId: params.vendorId,
                    invoiceNumber: params.invoiceNumber,
                    invoiceDate: params.invoiceDate,
                    dueDate: params.dueDate,
                    description: params.description,
                    poNumber: params.poNumber
                },
                billLineItems: params.billLineItems.map((item) => ({
                    entity: "BillLineItem",
                    amount: item.amount,
                    chartOfAccountId: item.chartOfAccountId,
                    departmentId: item.departmentId,
                    description: item.description,
                    lineType: "1" // Expense line
                }))
            }
        );

        if (!response.response_data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create bill",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.response_data
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create bill";

        if (message.includes("validation") || message.includes("Vendor not found")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
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
