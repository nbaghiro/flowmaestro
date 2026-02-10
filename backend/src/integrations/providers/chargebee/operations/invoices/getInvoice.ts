import { z } from "zod";
import { ChargebeeClient } from "../../client/ChargebeeClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ChargebeeInvoice, ChargebeeSingleResponse } from "../types";

/**
 * Get Invoice operation schema
 */
export const getInvoiceSchema = z.object({
    id: z.string().min(1).describe("Invoice ID")
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>;

/**
 * Get Invoice operation definition
 */
export const getInvoiceOperation: OperationDefinition = {
    id: "getInvoice",
    name: "Get Invoice",
    description: "Get a specific invoice by ID from Chargebee",
    category: "invoices",
    inputSchema: getInvoiceSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get invoice operation
 */
export async function executeGetInvoice(
    client: ChargebeeClient,
    params: GetInvoiceParams
): Promise<OperationResult> {
    try {
        const response = await client.get<ChargebeeSingleResponse<ChargebeeInvoice>>(
            `/invoices/${encodeURIComponent(params.id)}`
        );

        if (!response.invoice) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Invoice not found",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.invoice
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get invoice";

        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: "Invoice not found",
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
