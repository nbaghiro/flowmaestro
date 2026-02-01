import { z } from "zod";
import { createServiceLogger } from "../../../../core/logging";
import { RedditClient } from "../client/RedditClient";
import { FullnameSchema, VoteDirectionSchema } from "../schemas";
import type { VoteDirection } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = createServiceLogger("Reddit");

/**
 * Vote operation schema
 */
export const voteSchema = z.object({
    fullname: FullnameSchema.describe("Fullname of post (t3_xxx) or comment (t1_xxx) to vote on"),
    direction: VoteDirectionSchema
});

export type VoteParams = z.infer<typeof voteSchema>;

/**
 * Vote operation definition
 */
export const voteOperation: OperationDefinition = (() => {
    try {
        return {
            id: "vote",
            name: "Vote",
            description: "Upvote, downvote, or remove vote on a post or comment.",
            category: "interactions",
            inputSchema: voteSchema,
            retryable: true,
            timeout: 10000
        };
    } catch (error) {
        logger.error({ err: error }, "Failed to create voteOperation");
        throw new Error(
            `Failed to create vote operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Convert vote direction string to number
 */
function voteDirectionToNumber(direction: "up" | "down" | "none"): VoteDirection {
    switch (direction) {
        case "up":
            return 1;
        case "down":
            return -1;
        case "none":
            return 0;
    }
}

/**
 * Execute vote operation
 */
export async function executeVote(
    client: RedditClient,
    params: VoteParams
): Promise<OperationResult> {
    try {
        const direction = voteDirectionToNumber(params.direction);
        await client.vote(params.fullname, direction);

        return {
            success: true,
            data: {
                fullname: params.fullname,
                direction: params.direction,
                message: `Successfully ${params.direction === "none" ? "removed vote from" : `${params.direction}voted`} ${params.fullname}`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to vote",
                retryable: true
            }
        };
    }
}
