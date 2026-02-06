import { getLogger } from "../../../../core/logging";
import { SquarespaceClient } from "../client/SquarespaceClient";
import { GetSiteInfoSchema, type GetSiteInfoParams } from "../schemas";
import type { SquarespaceSite } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Site Info operation definition
 */
export const getSiteInfoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getSiteInfo",
            name: "Get Site Info",
            description: "Retrieve site/store information including domain and title",
            category: "site",
            inputSchema: GetSiteInfoSchema,
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Squarespace", err: error },
            "Failed to create getSiteInfoOperation"
        );
        throw new Error(
            `Failed to create getSiteInfo operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get site info operation
 */
export async function executeGetSiteInfo(
    client: SquarespaceClient,
    _params: GetSiteInfoParams
): Promise<OperationResult> {
    try {
        const response = await client.getSiteInfo();
        const data = response as SquarespaceSite;

        return {
            success: true,
            data: {
                site: data
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to get site info";

        // Check for authentication errors
        if (errorMessage.includes("authentication") || errorMessage.includes("401")) {
            return {
                success: false,
                error: {
                    type: "permission",
                    message: "Authentication failed. Please reconnect your Squarespace account.",
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: errorMessage,
                retryable: true
            }
        };
    }
}
