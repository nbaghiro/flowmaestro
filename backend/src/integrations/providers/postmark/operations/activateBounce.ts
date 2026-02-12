import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { PostmarkClient } from "../client/PostmarkClient";

export const activateBounceSchema = z.object({
    bounceId: z.number().describe("The ID of the bounce record to reactivate")
});

export type ActivateBounceParams = z.infer<typeof activateBounceSchema>;

export const activateBounceOperation: OperationDefinition = {
    id: "activateBounce",
    name: "Reactivate Bounce",
    description: "Reactivate a bounced email address to allow sending again",
    category: "data",
    inputSchema: activateBounceSchema,
    retryable: false,
    timeout: 30000
};

export async function executeActivateBounce(
    client: PostmarkClient,
    params: ActivateBounceParams
): Promise<OperationResult> {
    try {
        const response = await client.activateBounce(params.bounceId);

        return {
            success: true,
            data: {
                message: response.Message,
                bounce: {
                    id: response.Bounce.ID,
                    type: response.Bounce.Type,
                    email: response.Bounce.Email,
                    inactive: response.Bounce.Inactive,
                    canActivate: response.Bounce.CanActivate
                }
            }
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to activate bounce";
        const isNotFound = errorMessage.includes("not found") || errorMessage.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message: errorMessage,
                retryable: !isNotFound
            }
        };
    }
}
