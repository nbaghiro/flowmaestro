import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RipplingClient } from "../client/RipplingClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Teams operation schema
 */
export const listTeamsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListTeamsParams = z.infer<typeof listTeamsSchema>;

/**
 * List Teams operation definition
 */
export const listTeamsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTeams",
            name: "List Teams",
            description: "List teams in the Rippling organization",
            category: "hr",
            actionType: "read",
            inputSchema: listTeamsSchema,
            inputSchemaJSON: toJSONSchema(listTeamsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Rippling", err: error }, "Failed to create listTeamsOperation");
        throw new Error(
            `Failed to create listTeams operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list teams operation
 */
export async function executeListTeams(
    client: RipplingClient,
    params: ListTeamsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTeams({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                teams: response.data.map((team) => ({
                    id: team.id,
                    name: team.name,
                    description: team.description,
                    leaderId: team.leaderId,
                    leaderName: team.leaderName,
                    memberCount: team.memberCount,
                    createdAt: team.createdAt,
                    updatedAt: team.updatedAt
                })),
                pagination: {
                    total: response.pagination.total,
                    limit: response.pagination.limit,
                    offset: response.pagination.offset,
                    hasMore: response.pagination.hasMore
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list teams",
                retryable: true
            }
        };
    }
}
