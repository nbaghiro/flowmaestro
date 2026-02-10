import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseTransfer } from "../types";

/**
 * Create Transfer operation schema
 */
export const createTransferSchema = z.object({
    targetAccount: z.number().describe("Recipient account ID"),
    quoteUuid: z.string().uuid().describe("Quote UUID from createQuote operation"),
    customerTransactionId: z
        .string()
        .uuid()
        .optional()
        .describe("Unique transaction ID for idempotency"),
    reference: z.string().max(35).optional().describe("Transfer reference visible to recipient")
});

export type CreateTransferParams = z.infer<typeof createTransferSchema>;

/**
 * Create Transfer operation definition
 */
export const createTransferOperation: OperationDefinition = {
    id: "createTransfer",
    name: "Create Transfer",
    description: "Create a money transfer to a recipient",
    category: "transfers",
    inputSchema: createTransferSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute create transfer operation
 */
export async function executeCreateTransfer(
    client: WiseClient,
    params: CreateTransferParams
): Promise<OperationResult> {
    try {
        const transfer = await client.post<WiseTransfer>("/v1/transfers", {
            targetAccount: params.targetAccount,
            quoteUuid: params.quoteUuid,
            customerTransactionId: params.customerTransactionId,
            details: {
                reference: params.reference
            }
        });

        return {
            success: true,
            data: transfer
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create transfer";

        if (message.includes("validation")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message,
                    retryable: false
                }
            };
        }

        if (message.includes("expired")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Quote has expired. Please create a new quote.",
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
