import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { WebflowClient } from "../client/WebflowClient";
import { WebflowSiteIdSchema, WebflowDomainsSchema } from "../schemas";
import type { WebflowPublishSiteResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Publish Site operation schema
 */
export const publishSiteSchema = z.object({
    siteId: WebflowSiteIdSchema,
    domains: WebflowDomainsSchema
});

export type PublishSiteParams = z.infer<typeof publishSiteSchema>;

/**
 * Publish Site operation definition
 */
export const publishSiteOperation: OperationDefinition = (() => {
    try {
        return {
            id: "publishSite",
            name: "Publish Site",
            description: "Publish a Webflow site to production",
            category: "sites",
            inputSchema: publishSiteSchema,
            retryable: false,
            timeout: 60000 // Publishing can take longer
        };
    } catch (error) {
        logger.error(
            { component: "Webflow", err: error },
            "Failed to create publishSiteOperation"
        );
        throw new Error(
            `Failed to create publishSite operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute publish site operation
 */
export async function executePublishSite(
    client: WebflowClient,
    params: PublishSiteParams
): Promise<OperationResult> {
    try {
        const response = (await client.publishSite(params.siteId, {
            domains: params.domains
        })) as WebflowPublishSiteResponse;

        return {
            success: true,
            data: {
                publishedOn: response.publishedOn,
                customDomains: response.customDomains
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to publish site",
                retryable: false
            }
        };
    }
}
