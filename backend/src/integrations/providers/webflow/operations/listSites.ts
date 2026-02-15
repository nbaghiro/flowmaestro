import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import type { WebflowListSitesResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Sites operation schema
 */
export const listSitesSchema = z.object({});

export type ListSitesParams = z.infer<typeof listSitesSchema>;

/**
 * List Sites operation definition
 */
export const listSitesOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listSites",
            name: "List Sites",
            description: "List all Webflow sites accessible with the current token",
            category: "sites",
            inputSchema: listSitesSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Webflow", err: error }, "Failed to create listSitesOperation");
        throw new Error(
            `Failed to create listSites operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list sites operation
 */
export async function executeListSites(
    client: WebflowClient,
    _params: ListSitesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listSites()) as WebflowListSitesResponse;

        const sites = response.sites.map((site) => ({
            id: site.id,
            workspaceId: site.workspaceId,
            displayName: site.displayName,
            shortName: site.shortName,
            previewUrl: site.previewUrl,
            timeZone: site.timeZone,
            createdOn: site.createdOn,
            lastUpdated: site.lastUpdated,
            lastPublished: site.lastPublished,
            customDomains: site.customDomains?.map((d) => ({
                id: d.id,
                url: d.url
            }))
        }));

        return {
            success: true,
            data: {
                sites,
                count: sites.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list sites",
                retryable: true
            }
        };
    }
}
