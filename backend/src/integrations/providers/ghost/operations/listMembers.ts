import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const listMembersSchema = z.object({
    filter: z
        .string()
        .optional()
        .describe("Ghost NQL filter string, e.g. 'status:paid' or 'subscribed:true'"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(15)
        .describe("Maximum number of members to return (1-100, default: 15)"),
    page: z.number().int().min(1).optional().default(1).describe("Page number for pagination")
});

export type ListMembersParams = z.infer<typeof listMembersSchema>;

export const listMembersOperation: OperationDefinition = {
    id: "listMembers",
    name: "List Members",
    description: "List members on a Ghost site with optional filter",
    category: "data",
    inputSchema: listMembersSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListMembers(
    client: GhostClient,
    params: ListMembersParams
): Promise<OperationResult> {
    try {
        const response = await client.listMembers({
            filter: params.filter,
            limit: params.limit,
            page: params.page
        });

        const members = response.members.map((member) => ({
            id: member.id,
            uuid: member.uuid,
            email: member.email,
            name: member.name,
            status: member.status,
            subscribed: member.subscribed,
            createdAt: member.created_at,
            updatedAt: member.updated_at
        }));

        return {
            success: true,
            data: {
                members,
                pagination: response.meta.pagination
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list members",
                retryable: true
            }
        };
    }
}
