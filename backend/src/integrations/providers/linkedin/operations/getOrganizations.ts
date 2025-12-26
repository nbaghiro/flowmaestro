import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { LinkedInClient } from "../client/LinkedInClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Organizations operation schema (no parameters needed)
 */
export const getOrganizationsSchema = z.object({});

export type GetOrganizationsParams = z.infer<typeof getOrganizationsSchema>;

interface OrganizationACL {
    organization?: string;
    organizationId?: number;
    role?: string;
    state?: string;
}

interface OrganizationACLResponse {
    elements?: OrganizationACL[];
}

/**
 * Get Organizations operation definition
 */
export const getOrganizationsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getOrganizations",
            name: "Get Organizations",
            description:
                "Get the list of LinkedIn organizations (company pages) the user can post to as an admin.",
            category: "organizations",
            inputSchema: getOrganizationsSchema,
            inputSchemaJSON: toJSONSchema(getOrganizationsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "LinkedIn", err: error },
            "Failed to create getOrganizationsOperation"
        );
        throw new Error(
            `Failed to create getOrganizations operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get organizations operation
 */
export async function executeGetOrganizations(
    client: LinkedInClient,
    _params: GetOrganizationsParams
): Promise<OperationResult> {
    try {
        const response = (await client.getOrganizations()) as OrganizationACLResponse;

        const organizations = (response.elements || []).map((acl) => ({
            organizationUrn: acl.organization || `urn:li:organization:${acl.organizationId}`,
            organizationId: acl.organizationId,
            role: acl.role,
            state: acl.state
        }));

        return {
            success: true,
            data: {
                organizations,
                count: organizations.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get organizations",
                retryable: true
            }
        };
    }
}
