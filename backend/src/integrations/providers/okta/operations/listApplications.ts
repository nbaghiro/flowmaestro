import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { OktaClient } from "../client/OktaClient";
import { OktaPaginationSchema, OktaSearchSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Applications operation schema
 */
export const listApplicationsSchema = OktaPaginationSchema.merge(OktaSearchSchema);

export type ListApplicationsParams = z.input<typeof listApplicationsSchema>;

/**
 * List Applications operation definition
 */
export const listApplicationsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listApplications",
            name: "List Applications",
            description: "List all applications in the Okta organization",
            category: "applications",
            inputSchema: listApplicationsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "Okta", err: error },
            "Failed to create listApplicationsOperation"
        );
        throw new Error(
            `Failed to create listApplications operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list applications operation
 */
export async function executeListApplications(
    client: OktaClient,
    params: ListApplicationsParams
): Promise<OperationResult> {
    try {
        const parsed = listApplicationsSchema.parse(params);
        const apps = await client.listApplications({
            q: parsed.q,
            filter: parsed.filter,
            limit: parsed.limit,
            after: parsed.after
        });

        const normalizedApps = apps.map((app) => ({
            id: app.id,
            name: app.name,
            label: app.label,
            status: app.status,
            signOnMode: app.signOnMode,
            created: app.created,
            lastUpdated: app.lastUpdated
        }));

        return {
            success: true,
            data: {
                applications: normalizedApps,
                count: normalizedApps.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list applications",
                retryable: true
            }
        };
    }
}
