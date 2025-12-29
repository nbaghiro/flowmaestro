import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { RedditClient } from "../client/RedditClient";
import { FullnameSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Save operation schema
 */
export const saveSchema = z.object({
    fullname: FullnameSchema.describe("Fullname of post (t3_xxx) or comment (t1_xxx) to save"),
    category: z.string().optional().describe("Category to save to (Reddit Gold feature)")
});

export type SaveParams = z.infer<typeof saveSchema>;

/**
 * Unsave operation schema
 */
export const unsaveSchema = z.object({
    fullname: FullnameSchema.describe("Fullname of post (t3_xxx) or comment (t1_xxx) to unsave")
});

export type UnsaveParams = z.infer<typeof unsaveSchema>;

/**
 * Save operation definition
 */
export const saveOperation: OperationDefinition = (() => {
    try {
        return {
            id: "save",
            name: "Save",
            description: "Save a post or comment to your saved list.",
            category: "interactions",
            inputSchema: saveSchema,
            inputSchemaJSON: toJSONSchema(saveSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create saveOperation");
        throw new Error(
            `Failed to create save operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Unsave operation definition
 */
export const unsaveOperation: OperationDefinition = (() => {
    try {
        return {
            id: "unsave",
            name: "Unsave",
            description: "Remove a post or comment from your saved list.",
            category: "interactions",
            inputSchema: unsaveSchema,
            inputSchemaJSON: toJSONSchema(unsaveSchema),
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create unsaveOperation");
        throw new Error(
            `Failed to create unsave operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute save operation
 */
export async function executeSave(
    client: RedditClient,
    params: SaveParams
): Promise<OperationResult> {
    try {
        await client.save(params.fullname, params.category);

        return {
            success: true,
            data: {
                fullname: params.fullname,
                message: `Successfully saved ${params.fullname}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to save",
                retryable: true
            }
        };
    }
}

/**
 * Execute unsave operation
 */
export async function executeUnsave(
    client: RedditClient,
    params: UnsaveParams
): Promise<OperationResult> {
    try {
        await client.unsave(params.fullname);

        return {
            success: true,
            data: {
                fullname: params.fullname,
                message: `Successfully unsaved ${params.fullname}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to unsave",
                retryable: true
            }
        };
    }
}
