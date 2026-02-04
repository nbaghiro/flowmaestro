import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GhostClient } from "../client/GhostClient";

export const getSiteInfoSchema = z.object({});

export type GetSiteInfoParams = z.infer<typeof getSiteInfoSchema>;

export const getSiteInfoOperation: OperationDefinition = {
    id: "getSiteInfo",
    name: "Get Site Info",
    description: "Get site metadata and configuration from a Ghost site",
    category: "data",
    inputSchema: getSiteInfoSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetSiteInfo(
    client: GhostClient,
    _params: GetSiteInfoParams
): Promise<OperationResult> {
    try {
        const response = await client.getSiteInfo();

        return {
            success: true,
            data: {
                title: response.site.title,
                description: response.site.description,
                logo: response.site.logo,
                url: response.site.url,
                version: response.site.version
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get site info",
                retryable: true
            }
        };
    }
}
