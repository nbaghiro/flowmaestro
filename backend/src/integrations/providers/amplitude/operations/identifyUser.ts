import { z } from "zod";
import { AmplitudeClient } from "../client/AmplitudeClient";
import type { AmplitudeIdentifyResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * User properties operations schema
 */
const userPropertiesOperationsSchema = z.object({
    $set: z.record(z.unknown()).optional().describe("Set user properties to specific values"),
    $setOnce: z.record(z.unknown()).optional().describe("Set properties only if not already set"),
    $add: z.record(z.number()).optional().describe("Increment numeric properties"),
    $append: z.record(z.unknown()).optional().describe("Append values to array properties"),
    $prepend: z.record(z.unknown()).optional().describe("Prepend values to array properties"),
    $unset: z.record(z.unknown()).optional().describe("Remove properties from the user")
});

/**
 * Identify User operation schema
 */
export const identifyUserSchema = z
    .object({
        user_id: z.string().optional().describe("The user ID to identify"),
        device_id: z.string().optional().describe("The device ID to identify"),
        user_properties: userPropertiesOperationsSchema.describe(
            "User properties operations ($set, $setOnce, $add, $append, $prepend, $unset)"
        )
    })
    .refine((data) => data.user_id || data.device_id, {
        message: "Either user_id or device_id is required"
    });

export type IdentifyUserParams = z.infer<typeof identifyUserSchema>;

/**
 * Identify User operation definition
 */
export const identifyUserOperation: OperationDefinition = {
    id: "identifyUser",
    name: "Identify User",
    description: "Update user properties without tracking an event",
    category: "users",
    actionType: "write",
    inputSchema: identifyUserSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute identify user operation
 */
export async function executeIdentifyUser(
    client: AmplitudeClient,
    params: IdentifyUserParams
): Promise<OperationResult> {
    try {
        // Build the identification object
        const identification = {
            user_id: params.user_id,
            device_id: params.device_id,
            user_properties: params.user_properties
        };

        // Remove undefined top-level fields
        const cleanIdentification = Object.fromEntries(
            Object.entries(identification).filter(([, v]) => v !== undefined)
        );

        const response = await client.post<AmplitudeIdentifyResponse>("/identify", {
            identification: JSON.stringify([cleanIdentification])
        });

        return {
            success: true,
            data: {
                code: response.code,
                events_ingested: response.events_ingested,
                server_upload_time: response.server_upload_time
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to identify user",
                retryable: true
            }
        };
    }
}
