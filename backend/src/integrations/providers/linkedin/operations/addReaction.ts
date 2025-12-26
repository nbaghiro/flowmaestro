import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import { PostIdSchema, AuthorUrnSchema, ReactionTypeSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import { getLogger } from "../../../../core/logging";

const logger = getLogger();

/**
 * Add Reaction operation schema
 */
export const addReactionSchema = z.object({
    postId: PostIdSchema,
    actor: AuthorUrnSchema,
    reactionType: ReactionTypeSchema
});

export type AddReactionParams = z.infer<typeof addReactionSchema>;

/**
 * Add Reaction operation definition
 */
export const addReactionOperation: OperationDefinition = (() => {
    try {
        return {
            id: "addReaction",
            name: "Add Reaction",
            description:
                "Add a reaction (like, celebrate, support, love, insightful, or funny) to a LinkedIn post.",
            category: "engagement",
            inputSchema: addReactionSchema,
            inputSchemaJSON: toJSONSchema(addReactionSchema),
            retryable: false,
            timeout: 15000
        };
    } catch (error) {
        logger.error({ component: "LinkedIn", err: error }, "Failed to create addReactionOperation");
        throw new Error(
            `Failed to create addReaction operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute add reaction operation
 */
export async function executeAddReaction(
    client: LinkedInClient,
    params: AddReactionParams
): Promise<OperationResult> {
    try {
        await client.addReaction(params.postId, params.actor, params.reactionType);

        return {
            success: true,
            data: {
                postId: params.postId,
                actor: params.actor,
                reactionType: params.reactionType
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add reaction",
                retryable: false
            }
        };
    }
}
