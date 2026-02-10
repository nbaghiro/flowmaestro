import { z } from "zod";
import { WiseClient } from "../../client/WiseClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { WiseRecipient } from "../types";

/**
 * List Recipients operation schema
 */
export const listRecipientsSchema = z.object({
    profileId: z.number().describe("Profile ID to list recipients for"),
    currency: z.string().length(3).optional().describe("Filter by currency code")
});

export type ListRecipientsParams = z.infer<typeof listRecipientsSchema>;

/**
 * List Recipients operation definition
 */
export const listRecipientsOperation: OperationDefinition = {
    id: "listRecipients",
    name: "List Recipients",
    description: "List all recipient accounts for a profile",
    category: "recipients",
    inputSchema: listRecipientsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list recipients operation
 */
export async function executeListRecipients(
    client: WiseClient,
    params: ListRecipientsParams
): Promise<OperationResult> {
    try {
        let url = `/v2/accounts?profile=${params.profileId}`;
        if (params.currency) {
            url += `&currency=${params.currency}`;
        }

        const recipients = await client.get<WiseRecipient[]>(url);

        return {
            success: true,
            data: {
                recipients,
                count: recipients.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list recipients",
                retryable: true
            }
        };
    }
}
