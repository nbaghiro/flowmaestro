/**
 * GitBook Space Operations
 *
 * Spaces are documentation projects within an organization that contain pages and content.
 */

import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GitBookClient } from "../client/GitBookClient";
import type { GitBookSpace, GitBookSearchResult, GitBookListResponse } from "../types";

// ============================================
// List Spaces
// ============================================

export const listSpacesSchema = z.object({
    organizationId: z.string().describe("The organization ID to list spaces from"),
    page: z.string().optional().describe("Pagination token from previous response")
});

export type ListSpacesParams = z.infer<typeof listSpacesSchema>;

export const listSpacesOperation: OperationDefinition = {
    id: "listSpaces",
    name: "List Spaces",
    description: "List all spaces in a GitBook organization",
    category: "spaces",
    inputSchema: listSpacesSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListSpaces(
    client: GitBookClient,
    params: ListSpacesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listSpaces(params.organizationId, {
            page: params.page
        })) as GitBookListResponse<GitBookSpace>;

        return {
            success: true,
            data: {
                spaces: response.items || [],
                pagination: response.next
                    ? {
                          next: response.next.next
                      }
                    : null
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list spaces";
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

// ============================================
// Get Space
// ============================================

export const getSpaceSchema = z.object({
    spaceId: z.string().describe("The unique ID of the space")
});

export type GetSpaceParams = z.infer<typeof getSpaceSchema>;

export const getSpaceOperation: OperationDefinition = {
    id: "getSpace",
    name: "Get Space",
    description: "Retrieve details of a specific GitBook space by ID",
    category: "spaces",
    inputSchema: getSpaceSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetSpace(
    client: GitBookClient,
    params: GetSpaceParams
): Promise<OperationResult> {
    try {
        const space = (await client.getSpace(params.spaceId)) as GitBookSpace;

        return {
            success: true,
            data: space
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get space";
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

// ============================================
// Search Space Content
// ============================================

export const searchSpaceContentSchema = z.object({
    spaceId: z.string().describe("The space ID to search within"),
    query: z.string().min(1).describe("Search query string"),
    page: z.string().optional().describe("Pagination token from previous response")
});

export type SearchSpaceContentParams = z.infer<typeof searchSpaceContentSchema>;

export const searchSpaceContentOperation: OperationDefinition = {
    id: "searchSpaceContent",
    name: "Search Space Content",
    description: "Search for content within a GitBook space",
    category: "spaces",
    inputSchema: searchSpaceContentSchema,
    retryable: true,
    timeout: 30000
};

export async function executeSearchSpaceContent(
    client: GitBookClient,
    params: SearchSpaceContentParams
): Promise<OperationResult> {
    try {
        const response = (await client.searchSpaceContent(params.spaceId, {
            query: params.query,
            page: params.page
        })) as GitBookListResponse<GitBookSearchResult>;

        return {
            success: true,
            data: {
                results: response.items || [],
                pagination: response.next
                    ? {
                          next: response.next.next
                      }
                    : null
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to search space content";
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
