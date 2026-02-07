import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseQuote } from "../types";

/**
 * Create Quote operation schema
 */
export const createQuoteSchema = z.object({
    profileId: z.number().describe("Profile ID to create quote for"),
    sourceCurrency: z.string().length(3).describe("Source currency code (e.g., USD)"),
    targetCurrency: z.string().length(3).describe("Target currency code (e.g., EUR)"),
    sourceAmount: z.number().positive().optional().describe("Amount in source currency"),
    targetAmount: z.number().positive().optional().describe("Amount in target currency"),
    payOut: z
        .enum(["BALANCE", "BANK_TRANSFER", "SWIFT", "SWIFT_OUR", "INTERAC"])
        .optional()
        .default("BANK_TRANSFER")
});

export type CreateQuoteParams = z.infer<typeof createQuoteSchema>;

/**
 * Create Quote operation definition
 */
export const createQuoteOperation: OperationDefinition = {
    id: "createQuote",
    name: "Create Quote",
    description: "Create a transfer quote to get exchange rate and fees",
    category: "quotes",
    inputSchema: createQuoteSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create quote operation
 */
export async function executeCreateQuote(
    client: WiseClient,
    params: CreateQuoteParams
): Promise<OperationResult> {
    try {
        const { profileId, ...quoteParams } = params;

        const quote = await client.post<WiseQuote>(`/v3/profiles/${profileId}/quotes`, {
            ...quoteParams,
            profile: profileId
        });

        return {
            success: true,
            data: quote
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create quote";

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
