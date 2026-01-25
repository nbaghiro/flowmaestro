import { z } from "zod";
import { getLogger } from "../../../../../core/logging";
import { toJSONSchema } from "../../../../core/schema-utils";
import { ClickUpClient } from "../../client/ClickUpClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

const logger = getLogger();

/**
 * Get Workspaces operation schema
 */
export const getWorkspacesSchema = z.object({});

export type GetWorkspacesParams = z.infer<typeof getWorkspacesSchema>;

/**
 * Get Workspaces operation definition
 */
export const getWorkspacesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getWorkspaces",
            name: "Get Workspaces",
            description: "Get all authorized workspaces (teams) the user has access to",
            category: "hierarchy",
            actionType: "read",
            inputSchema: getWorkspacesSchema,
            inputSchemaJSON: toJSONSchema(getWorkspacesSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "ClickUp", err: error },
            "Failed to create getWorkspacesOperation"
        );
        throw new Error(
            `Failed to create getWorkspaces operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get workspaces operation
 */
export async function executeGetWorkspaces(
    client: ClickUpClient,
    _params: GetWorkspacesParams
): Promise<OperationResult> {
    try {
        const response = await client.getWorkspaces();

        return {
            success: true,
            data: {
                workspaces: response.teams.map((workspace) => ({
                    id: workspace.id,
                    name: workspace.name,
                    color: workspace.color,
                    avatar: workspace.avatar,
                    memberCount: workspace.members?.length || 0
                })),
                count: response.teams.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get workspaces",
                retryable: true
            }
        };
    }
}
