import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseRecipient } from "../types";

/**
 * Create Recipient operation schema
 */
export const createRecipientSchema = z.object({
    profileId: z.number().describe("Profile ID to create recipient for"),
    currency: z.string().length(3).describe("Currency code (e.g., EUR)"),
    type: z.string().describe("Recipient type (e.g., iban, sort_code, aba)"),
    accountHolderName: z.string().describe("Account holder name"),
    details: z.record(z.unknown()).describe("Bank account details (varies by type)")
});

export type CreateRecipientParams = z.infer<typeof createRecipientSchema>;

/**
 * Create Recipient operation definition
 */
export const createRecipientOperation: OperationDefinition = {
    id: "createRecipient",
    name: "Create Recipient",
    description: "Create a new recipient account for transfers",
    category: "recipients",
    inputSchema: createRecipientSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute create recipient operation
 */
export async function executeCreateRecipient(
    client: WiseClient,
    params: CreateRecipientParams
): Promise<OperationResult> {
    try {
        const recipient = await client.post<WiseRecipient>("/v1/accounts", {
            profile: params.profileId,
            currency: params.currency,
            type: params.type,
            accountHolderName: params.accountHolderName,
            details: params.details
        });

        return {
            success: true,
            data: recipient
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create recipient";

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
