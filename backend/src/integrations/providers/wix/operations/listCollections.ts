import { getLogger } from "../../../../core/logging";
import { WixClient } from "../client/WixClient";
import { ListCollectionsSchema, type ListCollectionsParams } from "../schemas";
import type { WixCollectionsResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Collections operation definition
 */
export const listCollectionsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listCollections",
            name: "List Collections",
            description: "Query product collections with optional search filter",
            category: "collections",
            inputSchema: ListCollectionsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Wix", err: error }, "Failed to create listCollectionsOperation");
        throw new Error(
            `Failed to create listCollections operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list collections operation
 */
export async function executeListCollections(
    client: WixClient,
    params: ListCollectionsParams
): Promise<OperationResult> {
    try {
        const response = await client.queryCollections({
            query: params.query,
            limit: params.limit,
            offset: params.offset
        });

        const data = response as WixCollectionsResponse;
        const collections = data.collections || [];

        return {
            success: true,
            data: {
                collections,
                count: collections.length,
                total: data.pagingMetadata?.total,
                hasNext: data.pagingMetadata?.hasNext
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list collections",
                retryable: true
            }
        };
    }
}
