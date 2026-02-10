/**
 * GitBook Organization Operations
 *
 * Organizations are the top-level containers in GitBook that contain spaces.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GitBookClient } from "../client/GitBookClient";
import type { GitBookOrganization, GitBookListResponse } from "../types";

// ============================================
// List Organizations
// ============================================

export const listOrganizationsSchema = z.object({
    page: z.string().optional().describe("Pagination token from previous response")
});

export type ListOrganizationsParams = z.infer<typeof listOrganizationsSchema>;

export const listOrganizationsOperation: OperationDefinition = {
    id: "listOrganizations",
    name: "List Organizations",
    description: "List all GitBook organizations the authenticated user has access to",
    category: "organizations",
    inputSchema: listOrganizationsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListOrganizations(
    client: GitBookClient,
    params: ListOrganizationsParams
): Promise<OperationResult> {
    try {
        const response = (await client.listOrganizations(
            params
        )) as GitBookListResponse<GitBookOrganization>;

        return {
            success: true,
            data: {
                organizations: response.items || [],
                pagination: response.next
                    ? {
                          next: response.next.next
                      }
                    : null
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list organizations";
        const isAuth = message.includes("authentication") || message.includes("401");

        return {
            success: false,
            error: {
                type: isAuth ? "permission" : "server_error",
                message,
                retryable: !isAuth
            }
        };
    }
}

// ============================================
// Get Organization
// ============================================

export const getOrganizationSchema = z.object({
    organizationId: z.string().describe("The unique ID of the organization")
});

export type GetOrganizationParams = z.infer<typeof getOrganizationSchema>;

export const getOrganizationOperation: OperationDefinition = {
    id: "getOrganization",
    name: "Get Organization",
    description: "Retrieve details of a specific GitBook organization by ID",
    category: "organizations",
    inputSchema: getOrganizationSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetOrganization(
    client: GitBookClient,
    params: GetOrganizationParams
): Promise<OperationResult> {
    try {
        const organization = (await client.getOrganization(
            params.organizationId
        )) as GitBookOrganization;

        return {
            success: true,
            data: organization
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get organization";
        const isNotFound = message.includes("not found") || message.includes("404");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
