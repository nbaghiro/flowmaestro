import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { FacebookClient } from "../client/FacebookClient";
import type { MessengerPageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Get Page Info operation schema
 */
export const getPageInfoSchema = z.object({
    pageId: z.string().describe("The Facebook Page ID")
});

export type GetPageInfoParams = z.infer<typeof getPageInfoSchema>;

/**
 * Get Page Info operation definition
 */
export const getPageInfoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPageInfo",
            name: "Get Page Info",
            description: "Get information about a Facebook Page",
            category: "page",
            inputSchema: getPageInfoSchema,
            inputSchemaJSON: toJSONSchema(getPageInfoSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "Messenger", err: error }, "Failed to create getPageInfoOperation");
        throw new Error(
            `Failed to create getPageInfo operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get page info operation
 */
export async function executeGetPageInfo(
    client: FacebookClient,
    params: GetPageInfoParams
): Promise<OperationResult> {
    try {
        const page = await client.getPageInfo(params.pageId);

        const data: MessengerPageResponse = {
            id: page.id,
            name: page.name,
            username: page.username,
            about: page.about,
            category: page.category,
            pictureUrl: page.picture?.data?.url
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get page info",
                retryable: true
            }
        };
    }
}
