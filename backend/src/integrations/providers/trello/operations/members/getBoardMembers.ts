import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import { TrelloClient } from "../../client/TrelloClient";
import { TrelloBoardIdSchema } from "../../schemas";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { TrelloBoardMember } from "../types";

/**
 * Get Board Members operation schema
 */
export const getBoardMembersSchema = z.object({
    boardId: TrelloBoardIdSchema
});

export type GetBoardMembersParams = z.infer<typeof getBoardMembersSchema>;

/**
 * Get Board Members operation definition
 */
export const getBoardMembersOperation: OperationDefinition = {
    id: "getBoardMembers",
    name: "Get Board Members",
    description: "Get all members of a Trello board",
    category: "members",
    inputSchema: getBoardMembersSchema,
    inputSchemaJSON: toJSONSchema(getBoardMembersSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute get board members operation
 */
export async function executeGetBoardMembers(
    client: TrelloClient,
    params: GetBoardMembersParams
): Promise<OperationResult> {
    try {
        const members = await client.get<TrelloBoardMember[]>(`/boards/${params.boardId}/members`, {
            fields: "id,fullName,username,avatarUrl,initials"
        });

        const mappedMembers = members.map((member) => ({
            id: member.id,
            fullName: member.fullName,
            username: member.username,
            avatarUrl: member.avatarUrl,
            initials: member.initials
        }));

        return {
            success: true,
            data: {
                members: mappedMembers,
                count: mappedMembers.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get board members",
                retryable: true
            }
        };
    }
}
