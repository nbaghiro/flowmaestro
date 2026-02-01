import { z } from "zod";
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
 * Create Profile Parameters
 */
export const createProfileSchema = z.object({
    email: z.string().email().optional().describe("Email address"),
    phone_number: z.string().optional().describe("Phone number in E.164 format"),
    external_id: z.string().optional().describe("External ID from your system"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    organization: z.string().optional().describe("Organization or company name"),
    title: z.string().optional().describe("Job title"),
    properties: z.record(z.unknown()).optional().describe("Custom properties"),
    location: locationSchema.optional().describe("Location information")
});

export type CreateProfileParams = z.infer<typeof createProfileSchema>;

/**
 * Operation Definition
 */
export const createProfileOperation: OperationDefinition = {
    id: "createProfile",
    name: "Create Profile",
    description: "Create a new profile in Klaviyo",
    category: "profiles",
    actionType: "write",
    inputSchema: createProfileSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute Create Profile
 */
export async function executeCreateProfile(
    client: KlaviyoClient,
    params: CreateProfileParams
): Promise<OperationResult> {
    try {
        const response = await client.createProfile({
            email: params.email,
            phone_number: params.phone_number,
            external_id: params.external_id,
            first_name: params.first_name,
            last_name: params.last_name,
            organization: params.organization,
            title: params.title,
            properties: params.properties,
            location: params.location
        });

        return {
            success: true,
            data: {
                id: response.data.id,
                ...response.data.attributes
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create profile",
                retryable: false
            }
        };
    }
}
