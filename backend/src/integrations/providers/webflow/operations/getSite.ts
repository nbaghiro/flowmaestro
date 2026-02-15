import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowSiteIdSchema } from "../schemas";
import type { WebflowGetSiteResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Site operation schema
 */
export const getSiteSchema = z.object({
    siteId: WebflowSiteIdSchema
});

export type GetSiteParams = z.infer<typeof getSiteSchema>;

/**
 * Get Site operation definition
 */
export const getSiteOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getSite",
            name: "Get Site",
            description: "Get details of a specific Webflow site",
            category: "sites",
            inputSchema: getSiteSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ component: "Webflow", err: error }, "Failed to create getSiteOperation");
        throw new Error(
            `Failed to create getSite operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get site operation
 */
export async function executeGetSite(
    client: WebflowClient,
    params: GetSiteParams
): Promise<OperationResult> {
    try {
        const response = (await client.getSite(params.siteId)) as WebflowGetSiteResponse;

        return {
            success: true,
            data: {
                id: response.id,
                workspaceId: response.workspaceId,
                displayName: response.displayName,
                shortName: response.shortName,
                previewUrl: response.previewUrl,
                timeZone: response.timeZone,
                createdOn: response.createdOn,
                lastUpdated: response.lastUpdated,
                lastPublished: response.lastPublished,
                customDomains: response.customDomains?.map((d) => ({
                    id: d.id,
                    url: d.url
                })),
                locales: response.locales
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get site",
                retryable: true
            }
        };
    }
}
