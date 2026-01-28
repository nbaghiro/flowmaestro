import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MediumClient } from "../client/MediumClient";

export const getMeSchema = z.object({});

export type GetMeParams = z.infer<typeof getMeSchema>;

export const getMeOperation: OperationDefinition = {
    id: "getMe",
    name: "Get Current User",
    description:
        "Get the authenticated user's details including ID, username, and profile information",
    category: "user",
    inputSchema: getMeSchema,
    inputSchemaJSON: toJSONSchema(getMeSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetMe(
    client: MediumClient,
    _params: GetMeParams
): Promise<OperationResult> {
    try {
        const response = await client.getMe();
        const user = response.data;

        return {
            success: true,
            data: {
                id: user.id,
                username: user.username,
                name: user.name,
                url: user.url,
                imageUrl: user.imageUrl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get user details",
                retryable: true
            }
        };
    }
}
