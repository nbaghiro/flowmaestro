import { z } from "zod";
import { BillComClient } from "../../client/BillComClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { BillComPayment, BillComApiResponse } from "../types";

/**
 * Create Payment operation schema
 */
export const createPaymentSchema = z.object({
    vendorId: z.string().describe("Vendor ID to pay"),
    processDate: z.string().describe("Payment process date (YYYY-MM-DD)"),
    billPays: z
        .array(
            z.object({
                billId: z.string().describe("Bill ID to pay"),
                amount: z.string().describe("Payment amount")
            })
        )
        .min(1)
        .describe("List of bills and amounts to pay")
});

export type CreatePaymentParams = z.infer<typeof createPaymentSchema>;

/**
 * Create Payment operation definition
 */
export const createPaymentOperation: OperationDefinition = {
    id: "createPayment",
    name: "Create Payment",
    description: "Create a payment to pay vendor bills",
    category: "payments",
    inputSchema: createPaymentSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create payment operation
 */
export async function executeCreatePayment(
    client: BillComClient,
    params: CreatePaymentParams
): Promise<OperationResult> {
    try {
        const response = await client.post<BillComApiResponse<BillComPayment>>("/PayBills.json", {
            vendorId: params.vendorId,
            processDate: params.processDate,
            billPays: params.billPays.map((bp) => ({
                billId: bp.billId,
                amount: bp.amount
            }))
        });

        if (!response.response_data) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create payment",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.response_data
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create payment";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Vendor or bill not found",
                    retryable: false
                }
            };
        }

        if (message.includes("validation") || message.includes("insufficient")) {
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
