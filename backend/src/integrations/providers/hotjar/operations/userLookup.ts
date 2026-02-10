import { z } from "zod";
import { HotjarClient } from "../client/HotjarClient";
import { HotjarOrganizationIdSchema } from "../schemas";
import type { HotjarUserLookupResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * User Lookup operation schema
 */
export const userLookupSchema = z
    .object({
        organization_id: HotjarOrganizationIdSchema,
        data_subject_email: z
            .string()
            .email()
            .optional()
            .describe("Email address of the data subject to look up"),
        data_subject_site_id_to_user_id_map: z
            .record(z.string())
            .optional()
            .describe("Map of site IDs to user IDs for the data subject"),
        delete_all_hits: z
            .boolean()
            .optional()
            .describe("Whether to delete all hits for the data subject (default: false)")
    })
    .refine((data) => data.data_subject_email || data.data_subject_site_id_to_user_id_map, {
        message:
            "At least one of data_subject_email or data_subject_site_id_to_user_id_map is required"
    });

export type UserLookupParams = z.infer<typeof userLookupSchema>;

/**
 * User Lookup operation definition
 */
export const userLookupOperation: OperationDefinition = {
    id: "userLookup",
    name: "User Lookup",
    description: "Look up or delete user data in Hotjar (GDPR/privacy compliance)",
    category: "data",
    actionType: "write",
    inputSchema: userLookupSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute user lookup operation
 */
export async function executeUserLookup(
    client: HotjarClient,
    params: UserLookupParams
): Promise<OperationResult> {
    try {
        const body: Record<string, unknown> = {};
        if (params.data_subject_email) {
            body.data_subject_email = params.data_subject_email;
        }
        if (params.data_subject_site_id_to_user_id_map) {
            body.data_subject_site_id_to_user_id_map = params.data_subject_site_id_to_user_id_map;
        }
        if (params.delete_all_hits !== undefined) {
            body.delete_all_hits = params.delete_all_hits;
        }

        const response = await client.post<HotjarUserLookupResponse>(
            `/v1/organizations/${params.organization_id}/user-lookup`,
            body
        );

        return {
            success: true,
            data: {
                status: response.status,
                message: response.message,
                request_id: response.request_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to perform user lookup",
                retryable: false
            }
        };
    }
}
