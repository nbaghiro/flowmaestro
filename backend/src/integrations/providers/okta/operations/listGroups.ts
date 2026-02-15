import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaPaginationSchema, OktaSearchSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Groups operation schema
 */
export const listGroupsSchema = OktaPaginationSchema.merge(OktaSearchSchema);

export type ListGroupsParams = z.input<typeof listGroupsSchema>;

/**
 * List Groups operation definition
 */
export const listGroupsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listGroups",
            name: "List Groups",
            description:
                "List all groups in the Okta organization with optional search and filtering",
            category: "groups",
            inputSchema: listGroupsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Okta", err: error }, "Failed to create listGroupsOperation");
        throw new Error(
            `Failed to create listGroups operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list groups operation
 */
export async function executeListGroups(
    client: OktaClient,
    params: ListGroupsParams
): Promise<OperationResult> {
    try {
        const parsed = listGroupsSchema.parse(params);
        const groups = await client.listGroups({
            q: parsed.q,
            filter: parsed.filter,
            limit: parsed.limit,
            after: parsed.after
        });

        const normalizedGroups = groups.map((group) => ({
            id: group.id,
            name: group.profile.name,
            description: group.profile.description,
            type: group.type,
            created: group.created,
            lastUpdated: group.lastUpdated,
            lastMembershipUpdated: group.lastMembershipUpdated
        }));

        return {
            success: true,
            data: {
                groups: normalizedGroups,
                count: normalizedGroups.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list groups",
                retryable: true
            }
        };
    }
}
