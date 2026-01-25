import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { KlaviyoClient } from "../client/KlaviyoClient";

const locationSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    zip: z.string().optional(),
    timezone: z.string().optional()
});

/**
 * Update Profile Parameters
 */
export const updateProfileSchema = z.object({
    profileId: z.string().describe("The ID of the profile to update"),
    email: z.string().email().optional().describe("Updated email address"),
    phone_number: z.string().optional().describe("Updated phone number in E.164 format"),
    external_id: z.string().optional().describe("Updated external ID"),
    first_name: z.string().optional().describe("Updated first name"),
    last_name: z.string().optional().describe("Updated last name"),
    organization: z.string().optional().describe("Updated organization"),
    title: z.string().optional().describe("Updated job title"),
    properties: z.record(z.unknown()).optional().describe("Custom properties to update"),
    location: locationSchema.optional().describe("Updated location information")
});

export type UpdateProfileParams = z.infer<typeof updateProfileSchema>;

/**
 * Operation Definition
 */
export const updateProfileOperation: OperationDefinition = {
    id: "updateProfile",
    name: "Update Profile",
    description: "Update an existing profile's attributes",
    category: "profiles",
    actionType: "write",
    inputSchema: updateProfileSchema,
    inputSchemaJSON: toJSONSchema(updateProfileSchema),
    retryable: true,
    timeout: 15000
};

/**
 * Execute Update Profile
 */
export async function executeUpdateProfile(
    client: KlaviyoClient,
    params: UpdateProfileParams
): Promise<OperationResult> {
    try {
        const updateData: Record<string, unknown> = {};

        if (params.email) updateData.email = params.email;
        if (params.phone_number) updateData.phone_number = params.phone_number;
        if (params.external_id) updateData.external_id = params.external_id;
        if (params.first_name) updateData.first_name = params.first_name;
        if (params.last_name) updateData.last_name = params.last_name;
        if (params.organization) updateData.organization = params.organization;
        if (params.title) updateData.title = params.title;
        if (params.properties) updateData.properties = params.properties;
        if (params.location) updateData.location = params.location;

        const response = await client.updateProfile(params.profileId, updateData);

        return {
            success: true,
            data: {
                id: response.data.id,
                ...response.data.attributes
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update profile";
        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Profile with ID ${params.profileId} not found`,
                    retryable: false
                }
            };
        }
        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: false
            }
        };
    }
}
