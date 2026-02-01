import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const listChatMembersSchema = z.object({
    chatId: z.string().describe("ID of the chat")
});

export type ListChatMembersParams = z.infer<typeof listChatMembersSchema>;

export const listChatMembersOperation: OperationDefinition = {
    id: "listChatMembers",
    name: "List Chat Members",
    description: "List members of a Microsoft Teams chat",
    category: "chats",
    inputSchema: listChatMembersSchema,
    retryable: true
};

export async function executeListChatMembers(
    client: MicrosoftTeamsClient,
    params: ListChatMembersParams
): Promise<OperationResult> {
    try {
        const result = await client.listChatMembers(params.chatId);
        return {
            success: true,
            data: {
                members: result.value.map((member) => ({
                    id: member.id,
                    displayName: member.displayName,
                    email: member.email,
                    roles: member.roles
                })),
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list chat members",
                retryable: true
            }
        };
    }
}
