import { z } from "zod";
import { HelpScoutClient } from "../client/HelpScoutClient";
import type { HelpScoutMailboxesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listMailboxesSchema = z.object({
    page: z.number().optional().default(1).describe("Page number")
});

export type ListMailboxesParams = z.infer<typeof listMailboxesSchema>;

export const listMailboxesOperation: OperationDefinition = {
    id: "listMailboxes",
    name: "List Mailboxes",
    description: "List all mailboxes in your Help Scout account",
    category: "mailboxes",
    actionType: "read",
    inputSchema: listMailboxesSchema,
    retryable: true,
    timeout: 10000
};

export async function executeListMailboxes(
    client: HelpScoutClient,
    params: ListMailboxesParams
): Promise<OperationResult> {
    try {
        const qs = params.page ? `?page=${params.page}` : "";
        const response = await client.get<HelpScoutMailboxesResponse>(`/mailboxes${qs}`);

        return {
            success: true,
            data: {
                mailboxes: response._embedded.mailboxes.map((m) => ({
                    id: m.id,
                    name: m.name,
                    slug: m.slug,
                    email: m.email,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt
                })),
                page: response.page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list mailboxes",
                retryable: true
            }
        };
    }
}
