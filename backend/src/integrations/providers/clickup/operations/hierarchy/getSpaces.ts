import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { toJSONSchema } from "../../../../core/schema-utils";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Get Spaces operation schema
 */
export const getSpacesSchema = z.object({
    workspaceId: z.string().describe("The workspace/team ID"),
    archived: z.boolean().optional().describe("Include archived spaces")
});

export type GetSpacesParams = z.infer<typeof getSpacesSchema>;

/**
 * Get Spaces operation definition
 */
export const getSpacesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getSpaces",
            name: "Get Spaces",
            description: "Get all spaces in a workspace",
            category: "hierarchy",
            actionType: "read",
            inputSchema: getSpacesSchema,
            inputSchemaJSON: toJSONSchema(getSpacesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "ClickUp", err: error }, "Failed to create getSpacesOperation");
        throw new Error(
            `Failed to create getSpaces operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get spaces operation
 */
export async function executeGetSpaces(
    client: ClickUpClient,
    params: GetSpacesParams
): Promise<OperationResult> {
    try {
        const response = await client.getSpaces(params.workspaceId, params.archived);

        return {
            success: true,
            data: {
                spaces: response.spaces.map((space) => ({
                    id: space.id,
                    name: space.name,
                    private: space.private,
                    archived: space.archived,
                    statuses: space.statuses?.map((s) => ({
                        status: s.status,
                        type: s.type,
                        color: s.color
                    })),
                    features: {
                        dueDates: space.features?.due_dates?.enabled,
                        sprints: space.features?.sprints?.enabled,
                        timeTracking: space.features?.time_tracking?.enabled,
                        points: space.features?.points?.enabled,
                        priorities: space.features?.priorities?.enabled,
                        tags: space.features?.tags?.enabled,
                        milestones: space.features?.milestones?.enabled
                    }
                })),
                count: response.spaces.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get spaces",
                retryable: true
            }
        };
    }
}
