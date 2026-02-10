import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutMailbox } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getMailboxSchema = z.object({
    mailbox_id: z.number().describe("Mailbox ID")
});

export type GetMailboxParams = z.infer<typeof getMailboxSchema>;

export const getMailboxOperation: OperationDefinition = {
    id: "getMailbox",
    name: "Get Mailbox",
    description: "Get a single mailbox by ID",
    category: "mailboxes",
    actionType: "read",
    inputSchema: getMailboxSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetMailbox(
    client: HelpScoutClient,
    params: GetMailboxParams
): Promise<OperationResult> {
    try {
        const response = await client.get<HelpScoutMailbox>(`/mailboxes/${params.mailbox_id}`);

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                slug: response.slug,
                email: response.email,
                createdAt: response.createdAt,
                updatedAt: response.updatedAt
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get mailbox",
                retryable: true
            }
        };
    }
}
